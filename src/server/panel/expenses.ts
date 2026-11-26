import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addDays, addMonths, isISODate, monthDates, todayISO } from "@/lib/dates";
import { CATEGORY_SLUGS, type ExpenseCategory } from "@/lib/studio/expenses";
import { db, schema } from "../db";
import { HttpError } from "../http";
import { audit, type StudioCtx } from "./auth";

/* Xarajatlar (Figma 10 · Xarajatlar) — owner only, like Dashboard (MVP-SCOPE: managers don't see money totals).
   Month view is cash based, the same rule as Dashboard: Tushum = payments received in the month,
   Xarajat = expenses spent in the month, Sof foyda = the difference.
   Tadbir foydasi is per order: order total − expenses linked to it. */

const MAX_SUM = 100_000_000_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const notFound = () => new HttpError(404, "not_found", "Xarajat topilmadi");

const fields = {
  amount: z.number({ error: "Summani kiriting" }).int("Summa butun son boʻlsin").min(1, "Summa 0 dan katta boʻlsin").max(MAX_SUM, "Summa juda katta"),
  category: z.enum(CATEGORY_SLUGS, { error: "Kategoriyani tanlang" }),
  title: z.string().trim().min(2, "Nima uchun ekanini yozing").max(120, "Koʻpi bilan 120 ta belgi"),
  orderId: z.string().regex(UUID_RE, "Tadbir topilmadi").nullable().optional(),
  spentOn: z.string().refine(isISODate, "Sana notoʻgʻri"),
  paidBy: z.string().regex(UUID_RE, "Aʼzo topilmadi").nullable().optional(),
};
export const createSchema = z.object(fields);
export const patchSchema = z.object(fields).partial();
export const monthQuery = z.object({ month: z.string().regex(YM_RE).optional() });

/* Old receipts can be entered during setup (2 years back); never in the future */
function checkDate(iso: string) {
  const t = todayISO();
  if (iso > t) throw new HttpError(422, "validation", "Sana kelajakda boʻlmaydi", { fields: { spentOn: "Bugun yoki oldingi kun" } });
  if (iso < addDays(t, -730)) throw new HttpError(422, "validation", "Sana 2 yil oraligʻida boʻlsin", { fields: { spentOn: "Sana 2 yil oraligʻida boʻlsin" } });
}

async function checkRefs(ctx: StudioCtx, input: { orderId?: string | null; paidBy?: string | null }) {
  if (input.orderId) {
    const [o] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(eq(schema.orders.id, input.orderId), eq(schema.orders.studioId, ctx.studio.id)));
    if (!o) throw new HttpError(422, "validation", "Tadbir topilmadi", { fields: { orderId: "Tadbir topilmadi" } });
  }
  if (input.paidBy) {
    const [m] = await db
      .select({ id: schema.studioMembers.userId })
      .from(schema.studioMembers)
      .where(and(eq(schema.studioMembers.userId, input.paidBy), eq(schema.studioMembers.studioId, ctx.studio.id)));
    if (!m) throw new HttpError(422, "validation", "Aʼzo topilmadi", { fields: { paidBy: "Aʼzo topilmadi" } });
  }
}

type Row = {
  id: string; amount: string; category: ExpenseCategory; title: string; spent_on: string; created_at: string;
  order_id: string | null; client: string | null; venue: string | null; event_date: string | null;
  paid_by: string | null; paid_by_name: string | null; created_by_name: string | null;
};
const rowSelect = sql`
  select e.id, e.amount, e.category, e.title, e.spent_on::text, e.created_at,
         e.order_id, o.client_name as client, o.venue, o.event_date::text as event_date,
         e.paid_by, pu.name as paid_by_name, cu.name as created_by_name
  from expenses e
  left join orders o on o.id = e.order_id
  left join users pu on pu.id = e.paid_by
  left join users cu on cu.id = e.created_by`;
const toItem = (r: Row) => ({
  id: r.id,
  amount: Number(r.amount),
  category: r.category,
  title: r.title,
  date: r.spent_on,
  createdAt: new Date(r.created_at).toISOString(),
  order: r.order_id ? { id: r.order_id, client: r.client ?? "", venue: r.venue, date: r.event_date ?? "" } : null,
  paidBy: r.paid_by ? { id: r.paid_by, name: r.paid_by_name ?? "" } : null,
  createdBy: r.created_by_name,
});
export type ExpenseItem = ReturnType<typeof toItem>;

/* ── month overview ── */
export async function expenseOverview(ctx: StudioCtx, input: z.infer<typeof monthQuery>) {
  const studioId = ctx.studio.id;
  const today = todayISO();
  const current = today.slice(0, 7);
  const month = input.month && input.month <= current ? input.month : current;
  const prev = addMonths(month, -1);
  const from = `${month}-01`;
  const to = monthDates(month).at(-1)!;
  const prevFrom = `${prev}-01`;
  const prevTo = monthDates(prev).at(-1)!;
  const first = addMonths(month, -5); // chart: 6 months ending at the viewed one

  const liveExp = sql`e.studio_id = ${studioId} and e.deleted_at is null`;
  const livePay = sql`p.deleted_at is null and o.studio_id = ${studioId}`;

  const [money, cats, chartPay, chartExp, recent, events, any] = await Promise.all([
    db.execute<{ rev: string; prev_rev: string; exp: string; prev_exp: string; n: string }>(sql`
      select
        (select coalesce(sum(p.amount), 0) from order_payments p join orders o on o.id = p.order_id where ${livePay} and p.paid_on between ${from} and ${to}) as rev,
        (select coalesce(sum(p.amount), 0) from order_payments p join orders o on o.id = p.order_id where ${livePay} and p.paid_on between ${prevFrom} and ${prevTo}) as prev_rev,
        (select coalesce(sum(e.amount), 0) from expenses e where ${liveExp} and e.spent_on between ${from} and ${to}) as exp,
        (select coalesce(sum(e.amount), 0) from expenses e where ${liveExp} and e.spent_on between ${prevFrom} and ${prevTo}) as prev_exp,
        (select count(*) from expenses e where ${liveExp} and e.spent_on between ${from} and ${to}) as n`),
    db.execute<{ category: ExpenseCategory; sum: string; n: string }>(sql`
      select e.category, sum(e.amount) as sum, count(*) as n from expenses e
      where ${liveExp} and e.spent_on between ${from} and ${to}
      group by 1 order by 2 desc`),
    db.execute<{ k: string; v: string }>(sql`
      select to_char(p.paid_on, 'YYYY-MM') as k, sum(p.amount) as v
      from order_payments p join orders o on o.id = p.order_id
      where ${livePay} and p.paid_on between ${`${first}-01`} and ${to} group by 1`),
    db.execute<{ k: string; v: string }>(sql`
      select to_char(e.spent_on, 'YYYY-MM') as k, sum(e.amount) as v from expenses e
      where ${liveExp} and e.spent_on between ${`${first}-01`} and ${to} group by 1`),
    db.execute<Row>(sql`
      ${rowSelect}
      where ${liveExp} and e.spent_on between ${from} and ${to}
      order by e.spent_on desc, e.created_at desc
      limit 200`),
    // Tadbirlar: every non-cancelled order held this month, with its linked expenses
    db.execute<{ id: string; client: string; venue: string | null; event_type: string; event_date: string; total: string; paid: string; exp: string; n: string }>(sql`
      select o.id, o.client_name as client, o.venue, o.event_type, o.event_date::text, o.total,
             coalesce((select sum(p.amount) from order_payments p where p.order_id = o.id and p.deleted_at is null), 0) as paid,
             coalesce(sum(e.amount), 0) as exp, count(e.id) as n
      from orders o
      left join expenses e on e.order_id = o.id and e.deleted_at is null
      where o.studio_id = ${studioId} and o.status <> 'cancelled' and o.event_date between ${from} and ${to}
      group by o.id
      order by o.event_date desc, o.created_at desc`),
    db.execute<{ any: boolean }>(sql`select exists(select 1 from expenses e where ${liveExp}) as any`),
  ]);

  const m = money.rows[0];
  const revenue = Number(m.rev);
  const expense = Number(m.exp);
  const prevRevenue = Number(m.prev_rev);
  const prevExpense = Number(m.prev_exp);
  const pay = new Map(chartPay.rows.map((r) => [r.k, Number(r.v)]));
  const exp = new Map(chartExp.rows.map((r) => [r.k, Number(r.v)]));
  const ev = events.rows.map((r) => {
    const total = Number(r.total);
    const cost = Number(r.exp);
    return { id: r.id, client: r.client, venue: r.venue, eventType: r.event_type, date: r.event_date, total, paid: Number(r.paid), expense: cost, profit: total - cost, count: Number(r.n) };
  });

  return {
    today,
    month,
    current: month === current,
    kpi: {
      revenue,
      prevRevenue,
      expense,
      prevExpense,
      profit: revenue - expense,
      prevProfit: prevRevenue - prevExpense,
      events: ev.length,
      perEvent: ev.length ? Math.round(expense / ev.length) : 0,
    },
    categories: cats.rows.map((r) => ({ category: r.category, sum: Number(r.sum), count: Number(r.n) })),
    chart: Array.from({ length: 6 }, (_, i) => {
      const k = addMonths(first, i);
      return { month: k, revenue: pay.get(k) ?? 0, expense: exp.get(k) ?? 0 };
    }),
    count: Number(m.n),
    items: recent.rows.map(toItem),
    events: ev,
    hasAny: Boolean(any.rows[0]?.any),
  };
}

/* ── one ── */
export async function getExpense(ctx: StudioCtx, id: string) {
  if (!UUID_RE.test(id)) throw notFound();
  const { rows } = await db.execute<Row>(sql`${rowSelect} where e.id = ${id} and e.studio_id = ${ctx.studio.id} and e.deleted_at is null`);
  if (!rows[0]) throw notFound();
  return { expense: toItem(rows[0]) };
}

/* ── form options: orders to link (±3 months around today, newest first) and members who can pay ── */
export async function expenseOptions(ctx: StudioCtx) {
  const today = todayISO();
  const [orders, members] = await Promise.all([
    db.execute<{ id: string; client: string; venue: string | null; event_date: string }>(sql`
      select o.id, o.client_name as client, o.venue, o.event_date::text from orders o
      where o.studio_id = ${ctx.studio.id} and o.status <> 'cancelled'
        and o.event_date between ${addDays(today, -92)} and ${addDays(today, 92)}
      order by abs(o.event_date - ${today}::date), o.event_date desc
      limit 100`),
    db
      .select({ id: schema.users.id, name: schema.users.name, role: schema.studioMembers.role })
      .from(schema.studioMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.studioMembers.userId))
      .where(eq(schema.studioMembers.studioId, ctx.studio.id)),
  ]);
  return {
    orders: orders.rows.map((o) => ({ id: o.id, client: o.client, venue: o.venue, date: o.event_date })),
    members: members
      .map((m) => ({ ...m, name: m.name ?? "" }))
      .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "owner" ? -1 : 1)),
  };
}

/* ── write ── */
export async function createExpense(ctx: StudioCtx, input: z.infer<typeof createSchema>) {
  checkDate(input.spentOn);
  await checkRefs(ctx, input);
  const id = await db.transaction(async (tx) => {
    const [e] = await tx
      .insert(schema.expenses)
      .values({
        studioId: ctx.studio.id,
        amount: input.amount,
        category: input.category,
        title: input.title,
        spentOn: input.spentOn,
        orderId: input.orderId ?? null,
        paidBy: input.paidBy === undefined ? ctx.user.id : input.paidBy,
        createdBy: ctx.user.id,
      })
      .returning({ id: schema.expenses.id });
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "expense", entityId: e.id, action: "create", diff: { ...input } });
    return e.id;
  });
  return getExpense(ctx, id);
}

export async function patchExpense(ctx: StudioCtx, id: string, input: z.infer<typeof patchSchema>) {
  const { expense: before } = await getExpense(ctx, id);
  if (input.spentOn) checkDate(input.spentOn);
  await checkRefs(ctx, input);
  const old: Record<keyof typeof input, unknown> = {
    amount: before.amount, category: before.category, title: before.title, spentOn: before.date,
    orderId: before.order?.id ?? null, paidBy: before.paidBy?.id ?? null,
  };
  const changed: Record<string, [unknown, unknown]> = {};
  for (const [k, v] of Object.entries(input) as [keyof typeof input, unknown][]) {
    if (v === undefined) continue;
    if ((old[k] ?? null) !== (v ?? null)) changed[k] = [old[k] ?? null, v ?? null];
  }
  if (!Object.keys(changed).length) return { expense: before };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.expenses)
      .set({ ...Object.fromEntries(Object.keys(changed).map((k) => [k, input[k as keyof typeof input] ?? null])), updatedAt: new Date() })
      .where(and(eq(schema.expenses.id, id), eq(schema.expenses.studioId, ctx.studio.id)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "expense", entityId: id, action: "update", diff: changed });
  });
  return getExpense(ctx, id);
}

/* Soft delete — the row stays for the audit, every total ignores it */
export async function removeExpense(ctx: StudioCtx, id: string) {
  const { expense } = await getExpense(ctx, id);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.expenses)
      .set({ deletedAt: new Date(), deletedBy: ctx.user.id })
      .where(and(eq(schema.expenses.id, id), eq(schema.expenses.studioId, ctx.studio.id), isNull(schema.expenses.deletedAt)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "expense", entityId: id, action: "delete", diff: { amount: expense.amount, category: expense.category, title: expense.title } });
  });
  return { ok: true };
}

/* Undo of a delete (toast "Bekor qilish") */
export async function restoreExpense(ctx: StudioCtx, id: string) {
  if (!UUID_RE.test(id)) throw notFound();
  const [row] = await db
    .update(schema.expenses)
    .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
    .where(and(eq(schema.expenses.id, id), eq(schema.expenses.studioId, ctx.studio.id), sql`${schema.expenses.deletedAt} is not null`))
    .returning({ id: schema.expenses.id });
  if (!row) throw notFound();
  await audit(db, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "expense", entityId: id, action: "restore" });
  return getExpense(ctx, id);
}
