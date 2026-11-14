import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { isISODate, monthDates, todayISO } from "@/lib/dates";
import { canBlock, DAY_REASONS, dayStatus, type DayStatus } from "@/lib/studio/calendar";
import { db, schema } from "../db";
import { HttpError } from "../http";
import { audit, type StudioCtx } from "./auth";

export type CalendarOrder = { id: string; client: string; venue: string | null; eventType: string; total: number; paid: number; balance: number };
export type CalendarDay = { date: string; status: DayStatus; load: number; blocked: boolean; reason: string | null; note: string | null; orders: CalendarOrder[] };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const parseMonth = (m: string | null) => {
  if (!m || !MONTH_RE.test(m)) throw new HttpError(422, "validation", "Oy notoʻgʻri", { fields: { month: "YYYY-MM koʻrinishida" } });
  return m;
};

type OrderRow = { id: string; event_date: string; client_name: string; venue: string | null; event_type: string; total: string; paid: string };

/* Month view: only days that carry data (orders or a row in studio_days) — the UI treats the rest as free.
   One round-trip per table; balance = total − Σ live payments (soft-deleted payments never count). */
export async function monthView(ctx: StudioCtx, month: string) {
  const dates = monthDates(month);
  const from = dates[0];
  const to = dates[dates.length - 1];
  const studioId = ctx.studio.id;

  const [{ rows: orderRows }, dayRows] = await Promise.all([
    db.execute<OrderRow>(sql`
      select o.id, o.event_date::text, o.client_name, o.venue, o.event_type, o.total,
             coalesce((select sum(p.amount) from order_payments p where p.order_id = o.id and p.deleted_at is null), 0) as paid
      from orders o
      where o.studio_id = ${studioId} and o.status = 'active' and o.event_date between ${from} and ${to}
      order by o.event_date, o.created_at`),
    db
      .select({ day: schema.studioDays.day, blocked: schema.studioDays.blocked, reason: schema.studioDays.reason, note: schema.studioDays.note })
      .from(schema.studioDays)
      .where(and(eq(schema.studioDays.studioId, studioId), sql`${schema.studioDays.day} between ${from} and ${to}`)),
  ]);

  const byDate = new Map<string, CalendarDay>();
  const day = (date: string) => {
    let d = byDate.get(date);
    if (!d) byDate.set(date, (d = { date, status: "free", load: 0, blocked: false, reason: null, note: null, orders: [] }));
    return d;
  };
  for (const r of dayRows) Object.assign(day(r.day), { blocked: r.blocked, reason: r.reason, note: r.note });
  let due = 0;
  for (const r of orderRows) {
    const total = Number(r.total);
    const paid = Number(r.paid);
    const balance = total - paid;
    if (balance > 0) due++;
    day(r.event_date).orders.push({ id: r.id, client: r.client_name, venue: r.venue, eventType: r.event_type, total, paid, balance });
  }
  const cap = ctx.studio.dailyCapacity;
  const days = [...byDate.values()]
    .map((d) => ({ ...d, load: d.orders.length, status: dayStatus(d.orders.length, cap, d.blocked) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return { month, today: todayISO(), capacity: cap, summary: { events: orderRows.length, due }, days };
}

/* ── close / reopen a day ── */
export const dayBody = z
  .object({
    blocked: z.boolean(),
    reason: z.enum(["tamir", "dam", "shaxsiy", "boshqa"] satisfies (typeof DAY_REASONS)[number]["value"][], { error: "Sababni tanlang" }).optional(),
    note: z.string().trim().max(140, "Koʻpi bilan 140 ta belgi").optional(),
  })
  .refine((b) => !b.blocked || b.reason, { message: "Sababni tanlang", path: ["reason"] });

export async function setDay(ctx: StudioCtx, date: string, input: z.infer<typeof dayBody>) {
  if (!isISODate(date)) throw new HttpError(404, "not_found", "Sana topilmadi");
  const today = todayISO();
  if (input.blocked && !canBlock(date, today)) throw new HttpError(422, "date_out_of_range", "Oʻtgan yoki juda uzoq kunni yopib boʻlmaydi");

  const studioId = ctx.studio.id;
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ blocked: schema.studioDays.blocked, reason: schema.studioDays.reason, note: schema.studioDays.note })
      .from(schema.studioDays)
      .where(and(eq(schema.studioDays.studioId, studioId), eq(schema.studioDays.day, date)));

    if (input.blocked) {
      const values = { blocked: true, reason: input.reason ?? null, note: input.note || null, updatedAt: new Date() };
      await tx
        .insert(schema.studioDays)
        .values({ studioId, day: date, ...values })
        .onConflictDoUpdate({ target: [schema.studioDays.studioId, schema.studioDays.day], set: values });
    } else {
      // an open day has no row (studio_days stores only exceptions)
      await tx.delete(schema.studioDays).where(and(eq(schema.studioDays.studioId, studioId), eq(schema.studioDays.day, date)));
    }
    const was = before ?? { blocked: false, reason: null, note: null };
    const changed = input.blocked
      ? !was.blocked || was.reason !== (input.reason ?? null) || was.note !== (input.note || null)
      : was.blocked;
    if (changed) {
      await audit(tx, {
        studioId,
        actorId: ctx.user.id,
        entity: "day",
        entityId: date,
        action: input.blocked ? "block" : "unblock",
        diff: { before: was, after: input.blocked ? { blocked: true, reason: input.reason, note: input.note || null } : { blocked: false } },
      });
    }
  });

  const view = await monthView(ctx, date.slice(0, 7));
  const day = view.days.find((d) => d.date === date) ?? { date, status: dayStatus(0, ctx.studio.dailyCapacity, false), load: 0, blocked: false, reason: null, note: null, orders: [] };
  // closing a day that already has orders is allowed (they stay) — the UI tells the user
  return { day, warnings: input.blocked && day.load > 0 ? ["has_orders"] : [] };
}
