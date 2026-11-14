import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addDays, isISODate, todayISO } from "@/lib/dates";
import { STUDIO_EVENTS } from "@/lib/studio/calendar";
import { canTransition, ORDER_VIEWS, type OrderStatus, type OrderView } from "@/lib/studio/orders";
import { db, schema } from "../db";
import { HttpError } from "../http";
import { phoneSchema } from "../phone";
import { audit, type StudioCtx } from "./auth";

/* Datelle Studio — orders & payments (Tech §2, §5).
   Money is integer soʻm. Balance is always computed from live payments; payments are never physically deleted. */

const MAX_SUM = 100_000_000_000; // 100 mlrd soʻm — guards typos, fits bigint comfortably
const money = (label: string) =>
  z
    .number({ error: `${label}ni kiriting` })
    .int(`${label} butun son boʻlsin`)
    .min(0, `${label} manfiy boʻlmaydi`)
    .max(MAX_SUM, `${label} juda katta`);
const isoDate = z.string().refine(isISODate, "Sana notoʻgʻri");
const EVENT_SLUGS = STUDIO_EVENTS.map((e) => e.slug) as [string, ...string[]];
const METHODS = ["cash", "card", "transfer"] as const;

const orderFields = {
  clientName: z.string().trim().min(2, "Ismni kiriting").max(80, "Koʻpi bilan 80 ta belgi"),
  clientPhone: phoneSchema,
  eventDate: isoDate,
  eventType: z.enum(EVENT_SLUGS, { error: "Tadbir turini tanlang" }),
  venue: z.string().trim().max(120, "Koʻpi bilan 120 ta belgi").optional().transform((v) => v || null),
  guests: z.number().int().min(1, "Kamida 1").max(5000, "Juda koʻp").nullable().optional(),
  total: money("Summa"),
  notes: z.string().trim().max(500, "Koʻpi bilan 500 ta belgi").optional().transform((v) => v || null),
};

export const createSchema = z
  .object({
    ...orderFields,
    advance: z
      .object({ amount: money("Avans").min(1, "Avans 0 dan katta boʻlsin"), method: z.enum(METHODS).default("cash") })
      .optional(),
  })
  .refine((o) => !o.advance || o.advance.amount <= o.total, { message: "Avans summadan oshmasin", path: ["advance", "amount"] })
  .refine((o) => dateInWindow(o.eventDate), { message: "Sana 2 yil oraligʻida boʻlsin", path: ["eventDate"] });

export const patchSchema = z
  .object(orderFields)
  .partial()
  .refine((o) => !o.eventDate || dateInWindow(o.eventDate), { message: "Sana 2 yil oraligʻida boʻlsin", path: ["eventDate"] });

export const paymentSchema = z.object({
  amount: money("Summa").min(1, "Summa 0 dan katta boʻlsin"),
  method: z.enum(METHODS, { error: "Usulni tanlang" }),
  paidOn: isoDate.optional(),
  note: z.string().trim().max(140).optional().transform((v) => v || null),
});

export const statusSchema = z.object({ to: z.enum(["active", "done", "cancelled"]) });

/* Old orders can be entered during setup (2 years back); bookings go up to 2 years ahead */
function dateInWindow(iso: string) {
  const t = todayISO();
  return iso >= addDays(t, -730) && iso <= addDays(t, 730);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => new HttpError(404, "not_found", "Buyurtma topilmadi");

/* ── list ── */
export const listQuery = z.object({
  view: z.enum(ORDER_VIEWS).default("upcoming"),
  q: z.string().trim().max(60).optional(),
  sort: z.enum(["date", "total", "balance"]).default("date"),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export const PAGE_SIZE = 30;

type Row = {
  id: string; code: string; event_date: string; client_name: string; client_phone: string; venue: string | null;
  event_type: string; total: string; paid: string; status: OrderStatus;
};

export async function listOrders(ctx: StudioCtx, input: z.infer<typeof listQuery>) {
  const today = todayISO();
  const studioId = ctx.studio.id;
  const balance = sql`(o.total - coalesce(p.paid, 0))`;
  const viewWhere: Record<OrderView, ReturnType<typeof sql>> = {
    upcoming: sql`o.status = 'active' and o.event_date >= ${today}`,
    debt: sql`o.status in ('active', 'done') and ${balance} > 0`,
    past: sql`o.status in ('active', 'done') and (o.event_date < ${today} or o.status = 'done')`,
    cancelled: sql`o.status = 'cancelled'`,
  };
  const defaultDir: Record<OrderView, "asc" | "desc"> = { upcoming: "asc", debt: "asc", past: "desc", cancelled: "desc" };
  const dir = input.dir ?? (input.sort === "date" ? defaultDir[input.view] : "desc");
  const sortCol = { date: sql`o.event_date`, total: sql`o.total`, balance }[input.sort];
  const order = dir === "asc" ? sql`${sortCol} asc, o.created_at asc` : sql`${sortCol} desc, o.created_at desc`;

  // search: name / venue / code by substring, phone by digits
  const q = input.q?.trim();
  const digits = q?.replace(/\D/g, "") ?? "";
  const like = q ? `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  const search = like
    ? sql`and (o.client_name ilike ${like} or o.venue ilike ${like} or o.code ilike ${like}${digits.length >= 3 ? sql` or o.client_phone like ${`%${digits}%`}` : sql``})`
    : sql``;

  const base = sql`
    from orders o
    left join (select order_id, sum(amount) as paid from order_payments where deleted_at is null group by order_id) p on p.order_id = o.id
    where o.studio_id = ${studioId}`;

  const [{ rows }, { rows: counts }] = await Promise.all([
    db.execute<Row & { total_count: string }>(sql`
      select o.id, o.code, o.event_date::text, o.client_name, o.client_phone, o.venue, o.event_type, o.total,
             coalesce(p.paid, 0) as paid, o.status, count(*) over () as total_count
      ${base} and ${viewWhere[input.view]} ${search}
      order by ${order}
      limit ${PAGE_SIZE} offset ${(input.page - 1) * PAGE_SIZE}`),
    db.execute<Record<OrderView | "active", string>>(sql`
      select count(*) filter (where ${viewWhere.upcoming}) as upcoming,
             count(*) filter (where ${viewWhere.debt}) as debt,
             count(*) filter (where ${viewWhere.past}) as past,
             count(*) filter (where ${viewWhere.cancelled}) as cancelled,
             count(*) filter (where o.status = 'active') as active
      ${base}`),
  ]);

  const c = counts[0];
  return {
    view: input.view,
    page: input.page,
    pageSize: PAGE_SIZE,
    total: rows.length ? Number(rows[0].total_count) : 0,
    counts: { upcoming: +c.upcoming, debt: +c.debt, past: +c.past, cancelled: +c.cancelled, active: +c.active },
    today,
    items: rows.map((r) => {
      const total = Number(r.total);
      const paid = Number(r.paid);
      return { id: r.id, code: r.code, date: r.event_date, client: r.client_name, phone: r.client_phone, venue: r.venue, eventType: r.event_type, total, paid, balance: total - paid, status: r.status };
    }),
  };
}

/* Nav badge: how many orders still owe money (Figma Sidebar "Buyurtmalar · 9") */
export async function orderCounts(ctx: StudioCtx) {
  const { rows } = await db.execute<{ debt: string; active: string }>(sql`
    select count(*) filter (where o.status in ('active', 'done') and o.total - coalesce(p.paid, 0) > 0) as debt,
           count(*) filter (where o.status = 'active') as active
    from orders o
    left join (select order_id, sum(amount) as paid from order_payments where deleted_at is null group by order_id) p on p.order_id = o.id
    where o.studio_id = ${ctx.studio.id}`);
  return { debt: Number(rows[0].debt), active: Number(rows[0].active) };
}

/* ── create ── */
async function dayWarnings(studioId: string, capacity: number, date: string, excludeOrder?: string) {
  const { rows } = await db.execute<{ load: string; blocked: boolean | null }>(sql`
    select (select count(*) from orders where studio_id = ${studioId} and event_date = ${date} and status = 'active'
              ${excludeOrder ? sql`and id <> ${excludeOrder}` : sql``}) as load,
           (select blocked from studio_days where studio_id = ${studioId} and day = ${date}) as blocked`);
  const w: string[] = [];
  if (rows[0].blocked) w.push("day_blocked");
  if (Number(rows[0].load) + 1 > capacity) w.push("capacity_exceeded");
  return w;
}

const newCode = () => `DS-${randomInt(100_000, 1_000_000)}`;

export async function createOrder(ctx: StudioCtx, input: z.infer<typeof createSchema>) {
  const studioId = ctx.studio.id;
  // capacity is a warning, never a block (Tech §2): the studio decides
  const warnings = await dayWarnings(studioId, ctx.studio.dailyCapacity, input.eventDate);
  const { advance, ...fields } = input;

  for (let attempt = 0; ; attempt++) {
    try {
      const order = await db.transaction(async (tx) => {
        const [o] = await tx
          .insert(schema.orders)
          .values({ ...fields, guests: fields.guests ?? null, studioId, code: newCode(), createdBy: ctx.user.id })
          .returning({ id: schema.orders.id, code: schema.orders.code });
        if (advance) {
          await tx.insert(schema.orderPayments).values({ orderId: o.id, amount: advance.amount, method: advance.method, paidOn: todayISO(), note: "Avans", createdBy: ctx.user.id });
        }
        await audit(tx, { studioId, actorId: ctx.user.id, entity: "order", entityId: o.id, action: "create", diff: { ...fields, advance: advance ?? null } });
        return o;
      });
      return { order: await getOrder(ctx, order.id), warnings };
    } catch (e) {
      // DS-###### collided with an existing code — retry with a fresh one
      if (attempt < 3 && (e as { cause?: { code?: string }; code?: string }).cause?.code === "23505") continue;
      throw e;
    }
  }
}

/* ── read one ── */
export async function getOrder(ctx: StudioCtx, id: string) {
  if (!UUID_RE.test(id)) throw notFound();
  const [o] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, id), eq(schema.orders.studioId, ctx.studio.id)));
  if (!o) throw notFound();
  const payments = await db
    .select({
      id: schema.orderPayments.id,
      amount: schema.orderPayments.amount,
      method: schema.orderPayments.method,
      paidOn: schema.orderPayments.paidOn,
      note: schema.orderPayments.note,
      createdAt: schema.orderPayments.createdAt,
      by: schema.users.name,
    })
    .from(schema.orderPayments)
    .leftJoin(schema.users, eq(schema.users.id, schema.orderPayments.createdBy))
    .where(and(eq(schema.orderPayments.orderId, id), isNull(schema.orderPayments.deletedAt)))
    .orderBy(asc(schema.orderPayments.paidOn), asc(schema.orderPayments.createdAt));
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return {
    id: o.id, code: o.code, date: o.eventDate, eventType: o.eventType, venue: o.venue, guests: o.guests,
    client: o.clientName, phone: o.clientPhone, total: o.total, notes: o.notes, status: o.status,
    createdAt: o.createdAt, paid, balance: o.total - paid,
    payments: payments.map((p) => ({ ...p, by: p.by ?? null })),
  };
}

/* ── edit ── */
export async function patchOrder(ctx: StudioCtx, id: string, input: z.infer<typeof patchSchema>) {
  const before = await getOrder(ctx, id);
  const map = { clientName: "client", clientPhone: "phone", eventDate: "date", eventType: "eventType", venue: "venue", guests: "guests", total: "total", notes: "notes" } as const;
  const changed: Record<string, [unknown, unknown]> = {};
  for (const [k, v] of Object.entries(input) as [keyof typeof map, unknown][]) {
    if (v === undefined) continue;
    const old = before[map[k]];
    if ((old ?? null) !== (v ?? null)) changed[k] = [old ?? null, v ?? null];
  }
  if (!Object.keys(changed).length) return { order: before, warnings: [] as string[] };

  const warnings = changed.eventDate && before.status === "active" ? await dayWarnings(ctx.studio.id, ctx.studio.dailyCapacity, input.eventDate!, id) : [];
  await db.transaction(async (tx) => {
    await tx
      .update(schema.orders)
      .set({ ...Object.fromEntries(Object.keys(changed).map((k) => [k, input[k as keyof typeof input] ?? null])), updatedAt: new Date() })
      .where(and(eq(schema.orders.id, id), eq(schema.orders.studioId, ctx.studio.id)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "order", entityId: id, action: "update", diff: changed });
  });
  const order = await getOrder(ctx, id);
  if (order.balance < 0) warnings.push("overpaid");
  return { order, warnings };
}

/* ── status ── */
export async function setStatus(ctx: StudioCtx, id: string, to: OrderStatus) {
  const before = await getOrder(ctx, id);
  if (before.status === to) return { order: before, warnings: [] as string[] };
  if (!canTransition(before.status, to)) throw new HttpError(409, "invalid_transition", "Bu holatga oʻtkazib boʻlmaydi");
  const warnings = to === "active" ? await dayWarnings(ctx.studio.id, ctx.studio.dailyCapacity, before.date, id) : [];
  await db.transaction(async (tx) => {
    await tx
      .update(schema.orders)
      .set({ status: to, updatedAt: new Date(), cancelledAt: to === "cancelled" ? new Date() : null })
      .where(and(eq(schema.orders.id, id), eq(schema.orders.studioId, ctx.studio.id)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "order", entityId: id, action: "status", diff: { from: before.status, to } });
  });
  return { order: await getOrder(ctx, id), warnings };
}

/* ── payments ── */
export async function addPayment(ctx: StudioCtx, orderId: string, input: z.infer<typeof paymentSchema>) {
  const order = await getOrder(ctx, orderId);
  if (order.status === "cancelled") throw new HttpError(409, "order_cancelled", "Bekor qilingan buyurtmaga toʻlov qoʻshib boʻlmaydi");
  const paidOn = input.paidOn ?? todayISO();
  if (paidOn > todayISO()) throw new HttpError(422, "validation", "Toʻlov sanasi kelajakda boʻlmaydi", { fields: { paidOn: "Bugun yoki oldingi kun" } });
  await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(schema.orderPayments)
      .values({ orderId, amount: input.amount, method: input.method, paidOn, note: input.note, createdBy: ctx.user.id })
      .returning({ id: schema.orderPayments.id });
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "payment", entityId: p.id, action: "create", diff: { orderId, amount: input.amount, method: input.method, paidOn } });
  });
  const after = await getOrder(ctx, orderId);
  return { order: after, warnings: after.balance < 0 ? ["overpaid"] : [] };
}

async function deletePayment(ctx: StudioCtx, paymentId: string) {
  if (!UUID_RE.test(paymentId)) throw new HttpError(404, "not_found", "Toʻlov topilmadi");
  const [p] = await db
    .select({ id: schema.orderPayments.id, orderId: schema.orderPayments.orderId, amount: schema.orderPayments.amount, method: schema.orderPayments.method })
    .from(schema.orderPayments)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderPayments.orderId))
    .where(and(eq(schema.orderPayments.id, paymentId), eq(schema.orders.studioId, ctx.studio.id), isNull(schema.orderPayments.deletedAt)));
  if (!p) throw new HttpError(404, "not_found", "Toʻlov topilmadi");
  await db.transaction(async (tx) => {
    await tx.update(schema.orderPayments).set({ deletedAt: new Date(), deletedBy: ctx.user.id }).where(eq(schema.orderPayments.id, paymentId));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "payment", entityId: paymentId, action: "delete", diff: { orderId: p.orderId, amount: p.amount, method: p.method } });
  });
  return { order: await getOrder(ctx, p.orderId) };
}

/* Soft delete. Owner always (Tech §3); a manager only their own payment within 10 minutes — the toast "Bekor qilish" */
export async function removePayment(ctx: StudioCtx, paymentId: string) {
  if (!UUID_RE.test(paymentId)) throw new HttpError(404, "not_found", "Toʻlov topilmadi");
  const [p] = await db
    .select({ createdBy: schema.orderPayments.createdBy, createdAt: schema.orderPayments.createdAt })
    .from(schema.orderPayments)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderPayments.orderId))
    .where(and(eq(schema.orderPayments.id, paymentId), eq(schema.orders.studioId, ctx.studio.id), isNull(schema.orderPayments.deletedAt)));
  if (!p) throw new HttpError(404, "not_found", "Toʻlov topilmadi");
  const fresh = Date.now() - p.createdAt.getTime() < 10 * 60_000;
  if (ctx.role !== "owner" && !(p.createdBy === ctx.user.id && fresh)) throw new HttpError(403, "forbidden", "Toʻlovni faqat studiya egasi oʻchira oladi");
  return deletePayment(ctx, paymentId);
}

/* ── history ── */
export async function orderEvents(ctx: StudioCtx, orderId: string) {
  await getOrder(ctx, orderId); // tenancy check
  const { rows } = await db.execute<{ id: string; entity: string; action: string; diff: Record<string, unknown> | null; created_at: string; actor: string | null }>(sql`
    select e.id, e.entity, e.action, e.diff, e.created_at, u.name as actor
    from studio_events e left join users u on u.id = e.actor_id
    where e.studio_id = ${ctx.studio.id}
      and ((e.entity = 'order' and e.entity_id = ${orderId}) or (e.entity = 'payment' and e.diff->>'orderId' = ${orderId}))
    order by e.created_at desc
    limit 100`);
  return { events: rows.map((r) => ({ id: r.id, entity: r.entity, action: r.action, diff: r.diff, at: r.created_at, actor: r.actor })) };
}

