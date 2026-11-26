import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addDays, todayISO } from "@/lib/dates";
import { PROP_SLUGS, propCategory, propState, type PropCategory } from "@/lib/studio/props";
import { db, schema } from "../db";
import { HttpError } from "../http";
import { audit, type StudioCtx } from "./auth";

/* Rekvizit (Figma 08 · Rekvizit) — owner and manager (stock, not money).
   Units leave on the event day and stay "out" until a return is accepted. Warehouse stock is derived:
   stock = total − repair − out. Shortage on a day D (next 30 days) = units booked for D − (total − repair), and today also minus units still out from earlier events. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => new HttpError(404, "not_found", "Rekvizit topilmadi");
const MAX_QTY = 100_000;
const qty = (label: string) => z.number({ error: `${label}ni kiriting` }).int(`${label} butun son boʻlsin`).min(0, `${label} manfiy boʻlmaydi`).max(MAX_QTY, `${label} juda katta`);

const fields = {
  name: z.string().trim().min(2, "Nomini yozing").max(80, "Koʻpi bilan 80 ta belgi"),
  category: z.enum(PROP_SLUGS, { error: "Kategoriyani tanlang" }),
  total: qty("Soni"),
  code: z.string().trim().max(16, "Koʻpi bilan 16 ta belgi").regex(/^[\p{L}\p{N}-]*$/u, "Faqat harf, raqam va «-»").optional().transform((v) => v?.toUpperCase() || undefined),
  note: z.string().trim().max(300, "Koʻpi bilan 300 ta belgi").optional().transform((v) => v || null),
};
export const createSchema = z.object(fields);
export const patchSchema = z.object(fields).partial();
export const bookSchema = z.object({ orderId: z.string().regex(UUID_RE, "Tadbirni tanlang"), qty: qty("Soni") });
export const repairSchema = z.object({ fixed: qty("Soni").min(1, "Kamida 1"), writeOff: z.boolean().default(false) });
export const returnSchema = z.object({
  lines: z
    .array(z.object({ bookingId: z.string().regex(UUID_RE), back: qty("Soni"), broken: qty("Soni").default(0), lost: qty("Soni").default(0) }))
    .min(1)
    .max(200),
});

type BookingRow = {
  id: string; prop_id: string; order_id: string; qty: number; back: number; broken: number; lost: number;
  event_date: string; client: string; venue: string | null; event_type: string;
};
const outstanding = (b: { qty: number; back: number; broken: number; lost: number }) => b.qty - b.back - b.broken - b.lost;

async function liveBookings(studioId: string, extra = sql``) {
  const { rows } = await db.execute<BookingRow>(sql`
    select b.id, b.prop_id, b.order_id, b.qty, b.back, b.broken, b.lost,
           o.event_date::text as event_date, o.client_name as client, o.venue, o.event_type
    from prop_bookings b
    join orders o on o.id = b.order_id
    join props p on p.id = b.prop_id and p.deleted_at is null
    where b.studio_id = ${studioId} and o.status <> 'cancelled' ${extra}
    order by o.event_date, o.created_at`);
  return rows;
}

type PropRow = typeof schema.props.$inferSelect;
function summarize(p: PropRow, bookings: BookingRow[], today: string) {
  const mine = bookings.filter((b) => b.prop_id === p.id);
  const out = mine.filter((b) => b.event_date <= today).reduce((s, b) => s + outstanding(b), 0);
  const pastOut = mine.filter((b) => b.event_date < today).reduce((s, b) => s + outstanding(b), 0);
  const overdue = mine.filter((b) => b.event_date < addDays(today, -1)).reduce((s, b) => s + outstanding(b), 0);
  const stock = p.total - p.repair - out;
  // shortage by day (next 30 days). Today: whatever is still out is really missing.
  // Later days assume outstanding units come back by then (overdue ones show as "Qaytmagan" instead).
  const capacityOn = (d: string) => p.total - p.repair - (d === today ? pastOut : 0);
  const need = new Map<string, { qty: number; orders: string[] }>();
  for (const b of mine) {
    if (b.event_date < today || b.event_date > addDays(today, 30)) continue;
    const n = need.get(b.event_date) ?? { qty: 0, orders: [] };
    n.qty += b.qty;
    n.orders.push(b.order_id);
    need.set(b.event_date, n);
  }
  const shortages = [...need.entries()]
    .filter(([date, n]) => n.qty > capacityOn(date))
    .map(([date, n]) => {
      const have = Math.max(0, capacityOn(date));
      return { date, need: n.qty, have, missing: n.qty - have, orders: n.orders.length };
    });
  const item = {
    id: p.id, name: p.name, code: p.code, category: p.category as PropCategory, note: p.note,
    total: p.total, repair: p.repair, out: out - overdue, overdue, stock: Math.max(0, stock),
  };
  return { item: { ...item, state: propState({ total: p.total, stock: item.stock, out: item.out, overdue, repair: p.repair }) }, shortages };
}

/* ── overview ── */
export async function propOverview(ctx: StudioCtx) {
  const studioId = ctx.studio.id;
  const today = todayISO();
  const [list, bookings] = await Promise.all([
    db.select().from(schema.props).where(and(eq(schema.props.studioId, studioId), isNull(schema.props.deletedAt))).orderBy(schema.props.name),
    liveBookings(studioId, sql`and (b.qty - b.back - b.broken - b.lost > 0)`),
  ]);
  const sums = list.map((p) => summarize(p, bookings, today));
  const items = sums.map((s) => s.item);
  const shortages = sums
    .flatMap((s) => s.shortages.map((x) => ({ ...x, propId: s.item.id, name: s.item.name })))
    .sort((a, b) => a.date.localeCompare(b.date) || b.missing - a.missing);

  const byName = new Map(list.map((p) => [p.id, p.name]));
  const group = (rows: BookingRow[], amount: (b: BookingRow) => number) => {
    const m = new Map<string, { orderId: string; client: string; venue: string | null; eventType: string; date: string; overdue: boolean; lines: { name: string; qty: number }[] }>();
    for (const b of rows) {
      const g = m.get(b.order_id) ?? { orderId: b.order_id, client: b.client, venue: b.venue, eventType: b.event_type, date: b.event_date, overdue: b.event_date < addDays(today, -1), lines: [] };
      g.lines.push({ name: byName.get(b.prop_id) ?? "", qty: amount(b) });
      m.set(b.order_id, g);
    }
    return [...m.values()];
  };
  const leaving = group(bookings.filter((b) => b.event_date === today), (b) => b.qty);
  const returning = group(bookings.filter((b) => b.event_date < today), outstanding).sort((a, b) => a.date.localeCompare(b.date));

  const counts: Record<string, number> = {};
  for (const i of items) counts[i.category] = (counts[i.category] ?? 0) + 1;
  const total = items.reduce((s, i) => s + i.total, 0);
  const out = items.reduce((s, i) => s + i.out + i.overdue, 0);
  const repair = items.reduce((s, i) => s + i.repair, 0);
  const next = shortages[0] ?? null;
  return {
    today,
    hasAny: items.length > 0,
    items,
    counts,
    kpi: {
      out,
      leaving: leaving.reduce((s, g) => s + g.lines.reduce((t, l) => t + l.qty, 0), 0),
      returning: returning.reduce((s, g) => s + g.lines.reduce((t, l) => t + l.qty, 0), 0),
      total,
      stock: items.reduce((s, i) => s + i.stock, 0),
      repair,
      repairKinds: items.filter((i) => i.repair > 0).length,
      missing: shortages.reduce((s, x) => s + x.missing, 0),
      next,
    },
    shortages: shortages.slice(0, 20),
    leaving,
    returning,
  };
}

/* ── one item: counts, booked dates, history ── */
export async function getProp(ctx: StudioCtx, id: string) {
  if (!UUID_RE.test(id)) throw notFound();
  const [p] = await db.select().from(schema.props).where(and(eq(schema.props.id, id), eq(schema.props.studioId, ctx.studio.id), isNull(schema.props.deletedAt)));
  if (!p) throw notFound();
  const today = todayISO();
  const bookings = await liveBookings(ctx.studio.id, sql`and b.prop_id = ${id} and (b.qty - b.back - b.broken - b.lost > 0 or o.event_date >= ${today})`);
  const { item, shortages } = summarize(p, bookings, today);
  const short = new Set(shortages.map((s) => s.date));
  const { rows: history } = await db.execute<{ id: string; action: string; diff: Record<string, unknown> | null; created_at: string; actor: string | null }>(sql`
    select e.id, e.action, e.diff, e.created_at, u.name as actor from studio_events e left join users u on u.id = e.actor_id
    where e.studio_id = ${ctx.studio.id} and e.entity = 'prop' and e.entity_id = ${id}
    order by e.created_at desc limit 30`);
  return {
    prop: {
      ...item,
      shortages,
      bookings: bookings.map((b) => ({
        id: b.id, orderId: b.order_id, client: b.client, venue: b.venue, eventType: b.event_type, date: b.event_date,
        qty: b.qty, outstanding: outstanding(b), accounted: b.back + b.broken + b.lost, short: short.has(b.event_date), overdue: b.event_date < addDays(today, -1) && outstanding(b) > 0,
      })),
      history: history.map((h) => ({ id: h.id, action: h.action, diff: h.diff, at: new Date(h.created_at).toISOString(), actor: h.actor })),
    },
  };
}

/* ── create / edit / delete ── */
async function nextCode(studioId: string, category: PropCategory) {
  const prefix = propCategory(category).prefix;
  const { rows } = await db.execute<{ n: string }>(sql`
    select coalesce(max(nullif(regexp_replace(code, ${`^${prefix}-`}, ''), code)::int), 0) as n
    from props where studio_id = ${studioId} and code ~ ${`^${prefix}-[0-9]+$`}`);
  return `${prefix}-${String(Number(rows[0]?.n ?? 0) + 1).padStart(2, "0")}`;
}
const codeTaken = () => new HttpError(422, "validation", "Bu kod band", { fields: { code: "Bu kod boshqa buyumda bor" } });
const isUnique = (e: unknown) => (e as { cause?: { code?: string }; code?: string }).cause?.code === "23505" || (e as { code?: string }).code === "23505";

export async function createProp(ctx: StudioCtx, input: z.infer<typeof createSchema>) {
  for (let attempt = 0; ; attempt++) {
    const code = input.code ?? (await nextCode(ctx.studio.id, input.category));
    try {
      const id = await db.transaction(async (tx) => {
        const [p] = await tx
          .insert(schema.props)
          .values({ studioId: ctx.studio.id, name: input.name, category: input.category, total: input.total, code, note: input.note, createdBy: ctx.user.id })
          .returning({ id: schema.props.id });
        await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "prop", entityId: p.id, action: "create", diff: { name: input.name, total: input.total, code } });
        return p.id;
      });
      return getProp(ctx, id);
    } catch (e) {
      if (!isUnique(e)) throw e;
      if (input.code) throw codeTaken();
      if (attempt >= 3) throw e;
    }
  }
}

export async function patchProp(ctx: StudioCtx, id: string, input: z.infer<typeof patchSchema>) {
  const { prop } = await getProp(ctx, id);
  if (input.total !== undefined && input.total < prop.repair + prop.out + prop.overdue) {
    throw new HttpError(422, "validation", "Soni kam", { fields: { total: `Kamida ${prop.repair + prop.out + prop.overdue} — shuncha tadbirda yoki taʼmirda` } });
  }
  const old = { name: prop.name, category: prop.category, total: prop.total, code: prop.code, note: prop.note };
  const changed: Record<string, [unknown, unknown]> = {};
  for (const [k, v] of Object.entries(input) as [keyof typeof old, unknown][]) {
    if (v === undefined) continue;
    if ((old[k] ?? null) !== (v ?? null)) changed[k] = [old[k] ?? null, v ?? null];
  }
  if (!Object.keys(changed).length) return { prop };
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.props)
        .set({ ...Object.fromEntries(Object.keys(changed).map((k) => [k, input[k as keyof typeof input] ?? null])), updatedAt: new Date() })
        .where(and(eq(schema.props.id, id), eq(schema.props.studioId, ctx.studio.id)));
      await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "prop", entityId: id, action: "update", diff: changed });
    });
  } catch (e) {
    if (isUnique(e)) throw codeTaken();
    throw e;
  }
  return getProp(ctx, id);
}

export async function removeProp(ctx: StudioCtx, id: string) {
  const { prop } = await getProp(ctx, id);
  if (prop.out + prop.overdue > 0) throw new HttpError(409, "prop_out", "Buyum hali tadbirda — avval qaytarishni qabul qiling");
  await db.transaction(async (tx) => {
    await tx.update(schema.props).set({ deletedAt: new Date() }).where(and(eq(schema.props.id, id), eq(schema.props.studioId, ctx.studio.id)));
    // future bookings of a deleted item would show as phantom shortages
    await tx.execute(sql`delete from prop_bookings b using orders o where o.id = b.order_id and b.prop_id = ${id} and o.event_date >= ${todayISO()} and b.back + b.broken + b.lost = 0`);
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "prop", entityId: id, action: "delete", diff: { name: prop.name, total: prop.total } });
  });
  return { ok: true };
}

/* ── Taʼmir: repaired units go back to stock, or are written off ── */
export async function repairProp(ctx: StudioCtx, id: string, input: z.infer<typeof repairSchema>) {
  const { prop } = await getProp(ctx, id);
  if (input.fixed > prop.repair) throw new HttpError(422, "validation", "Taʼmirda shuncha yoʻq", { fields: { fixed: `Koʻpi bilan ${prop.repair}` } });
  await db.transaction(async (tx) => {
    await tx
      .update(schema.props)
      .set({ repair: sql`${schema.props.repair} - ${input.fixed}`, ...(input.writeOff ? { total: sql`${schema.props.total} - ${input.fixed}` } : {}), updatedAt: new Date() })
      .where(and(eq(schema.props.id, id), eq(schema.props.studioId, ctx.studio.id)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "prop", entityId: id, action: input.writeOff ? "writeoff" : "repaired", diff: { qty: input.fixed } });
  });
  return getProp(ctx, id);
}

/* ── Tadbirga biriktirish: one booking per item per order; qty 0 removes it ── */
export async function bookProp(ctx: StudioCtx, id: string, input: z.infer<typeof bookSchema>) {
  const { prop } = await getProp(ctx, id);
  const [order] = await db
    .select({ id: schema.orders.id, status: schema.orders.status, date: schema.orders.eventDate, client: schema.orders.clientName })
    .from(schema.orders)
    .where(and(eq(schema.orders.id, input.orderId), eq(schema.orders.studioId, ctx.studio.id)));
  if (!order) throw new HttpError(422, "validation", "Tadbir topilmadi", { fields: { orderId: "Tadbir topilmadi" } });
  if (order.status === "cancelled") throw new HttpError(409, "order_cancelled", "Bekor qilingan buyurtmaga biriktirib boʻlmaydi");
  if (input.qty > prop.total) throw new HttpError(422, "validation", "Soni juda koʻp", { fields: { qty: `Jami ${prop.total} ta bor` } });
  const [existing] = await db.select().from(schema.propBookings).where(and(eq(schema.propBookings.propId, id), eq(schema.propBookings.orderId, input.orderId)));
  const accounted = existing ? existing.back + existing.broken + existing.lost : 0;
  if (existing && input.qty < accounted) throw new HttpError(422, "validation", "Qaytganidan kam boʻlmaydi", { fields: { qty: `Kamida ${accounted} — shuncha qaytib boʻlgan` } });
  await db.transaction(async (tx) => {
    if (input.qty === 0) {
      if (existing) await tx.delete(schema.propBookings).where(eq(schema.propBookings.id, existing.id));
    } else if (existing) {
      await tx.update(schema.propBookings).set({ qty: input.qty, updatedAt: new Date() }).where(eq(schema.propBookings.id, existing.id));
    } else {
      await tx.insert(schema.propBookings).values({ studioId: ctx.studio.id, propId: id, orderId: input.orderId, qty: input.qty, createdBy: ctx.user.id });
    }
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "prop", entityId: id, action: "book", diff: { orderId: input.orderId, client: order.client, date: order.date, qty: input.qty, before: existing?.qty ?? 0 } });
  });
  const after = await getProp(ctx, id);
  const short = after.prop.shortages.find((s) => s.date === order.date);
  return { ...after, warnings: short ? [`${short.missing} ta yetishmaydi`] : [] };
}

/* ── orders that props can be booked for ── */
export async function propOptions(ctx: StudioCtx) {
  const today = todayISO();
  const { rows } = await db.execute<{ id: string; client: string; venue: string | null; event_date: string }>(sql`
    select o.id, o.client_name as client, o.venue, o.event_date::text from orders o
    where o.studio_id = ${ctx.studio.id} and o.status = 'active' and o.event_date between ${addDays(today, -7)} and ${addDays(today, 365)}
    order by o.event_date, o.created_at limit 200`);
  return { orders: rows.map((o) => ({ id: o.id, client: o.client, venue: o.venue, date: o.event_date })) };
}

/* ── Qaytarishni qabul qilish: everything still out for one order ── */
export async function getReturn(ctx: StudioCtx, orderId: string) {
  if (!UUID_RE.test(orderId)) throw new HttpError(404, "not_found", "Buyurtma topilmadi");
  const [order] = await db
    .select({ id: schema.orders.id, client: schema.orders.clientName, venue: schema.orders.venue, date: schema.orders.eventDate, eventType: schema.orders.eventType })
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.studioId, ctx.studio.id)));
  if (!order) throw new HttpError(404, "not_found", "Buyurtma topilmadi");
  const { rows } = await db.execute<{ id: string; name: string; qty: number; back: number; broken: number; lost: number }>(sql`
    select b.id, p.name, b.qty, b.back, b.broken, b.lost from prop_bookings b join props p on p.id = b.prop_id
    where b.order_id = ${orderId} and b.studio_id = ${ctx.studio.id} and b.qty - b.back - b.broken - b.lost > 0
    order by p.name`);
  return { order, lines: rows.map((r) => ({ id: r.id, name: r.name, outstanding: outstanding(r) })) };
}

export async function acceptReturn(ctx: StudioCtx, orderId: string, input: z.infer<typeof returnSchema>) {
  const { lines, order } = await getReturn(ctx, orderId);
  const open = new Map(lines.map((l) => [l.id, l]));
  for (const l of input.lines) {
    const o = open.get(l.bookingId);
    if (!o) throw new HttpError(422, "validation", "Buyum bu buyurtmada yoʻq");
    if (l.back + l.broken + l.lost > o.outstanding) throw new HttpError(422, "validation", `${o.name}: koʻpi bilan ${o.outstanding} ta`);
  }
  await db.transaction(async (tx) => {
    for (const l of input.lines) {
      if (l.back + l.broken + l.lost === 0) continue;
      const [b] = await tx
        .update(schema.propBookings)
        .set({ back: sql`${schema.propBookings.back} + ${l.back}`, broken: sql`${schema.propBookings.broken} + ${l.broken}`, lost: sql`${schema.propBookings.lost} + ${l.lost}`, updatedAt: new Date() })
        .where(eq(schema.propBookings.id, l.bookingId))
        .returning({ propId: schema.propBookings.propId });
      if (l.broken || l.lost) {
        await tx
          .update(schema.props)
          .set({ repair: sql`${schema.props.repair} + ${l.broken}`, total: sql`${schema.props.total} - ${l.lost}`, updatedAt: new Date() })
          .where(eq(schema.props.id, b.propId));
      }
      await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "prop", entityId: b.propId, action: "return", diff: { orderId, client: order.client, date: order.date, back: l.back, broken: l.broken, lost: l.lost } });
    }
  });
  return getReturn(ctx, orderId);
}
