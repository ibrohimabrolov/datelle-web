import "server-only";
import { sql } from "drizzle-orm";
import { addDays, addMonths, monthDates, todayISO, weekdayIdx } from "@/lib/dates";
import { periodWindow } from "@/lib/studio/dashboard";
import { db } from "../db";
import type { StudioCtx } from "./auth";

/* Owner dashboard (Tech §5 GET /dashboard). Every number is computed from orders + live payments.
   Tushum = money actually received (payments by paid_on), not order totals. */

type OrderLite = { id: string; date: string; client: string; venue: string | null; eventType: string; total: number; paid: number; balance: number };
type Row = { id: string; event_date: string; client_name: string; venue: string | null; event_type: string; total: string; paid: string };
const lite = (r: Row): OrderLite => {
  const total = Number(r.total);
  const paid = Number(r.paid);
  return { id: r.id, date: r.event_date, client: r.client_name, venue: r.venue, eventType: r.event_type, total, paid, balance: total - paid };
};

export async function dashboard(ctx: StudioCtx) {
  const studioId = ctx.studio.id;
  const today = todayISO();
  const month = today.slice(0, 7);
  const { from: prevFrom, to: prevTo } = periodWindow(today);
  const weekEnd = addDays(today, 6 - weekdayIdx(today));
  const firstMonth = addMonths(month, -11);
  const firstWeek = addDays(today, -weekdayIdx(today) - 7 * 11);
  const firstYear = String(Number(today.slice(0, 4)) - 4);

  const paidSub = sql`(select order_id, sum(amount) as paid from order_payments where deleted_at is null group by order_id)`;
  const live = sql`p.deleted_at is null and o.studio_id = ${studioId}`;

  const [money, debtRows, next7, counts, months, weeks, years, setup] = await Promise.all([
    db.execute<{ mtd: string; prev: string }>(sql`
      select coalesce(sum(p.amount) filter (where p.paid_on between ${`${month}-01`} and ${today}), 0) as mtd,
             coalesce(sum(p.amount) filter (where p.paid_on between ${prevFrom} and ${prevTo}), 0) as prev
      from order_payments p join orders o on o.id = p.order_id
      where ${live}`),
    db.execute<Row>(sql`
      select o.id, o.event_date::text, o.client_name, o.venue, o.event_type, o.total, coalesce(pp.paid, 0) as paid
      from orders o left join ${paidSub} pp on pp.order_id = o.id
      where o.studio_id = ${studioId} and o.status in ('active', 'done') and o.total - coalesce(pp.paid, 0) > 0
      order by (o.event_date < ${today}) desc, o.event_date asc`),
    db.execute<Row>(sql`
      select o.id, o.event_date::text, o.client_name, o.venue, o.event_type, o.total, coalesce(pp.paid, 0) as paid
      from orders o left join ${paidSub} pp on pp.order_id = o.id
      where o.studio_id = ${studioId} and o.status = 'active' and o.event_date between ${today} and ${addDays(today, 6)}
      order by o.event_date, o.created_at`),
    db.execute<{ next30: string; week: string; total: string }>(sql`
      select count(*) filter (where status = 'active' and event_date between ${today} and ${addDays(today, 29)}) as next30,
             count(*) filter (where status = 'active' and event_date between ${today} and ${weekEnd}) as week,
             count(*) as total
      from orders where studio_id = ${studioId}`),
    db.execute<{ k: string; paid: string }>(sql`
      select to_char(p.paid_on, 'YYYY-MM') as k, sum(p.amount) as paid
      from order_payments p join orders o on o.id = p.order_id
      where ${live} and p.paid_on >= ${`${firstMonth}-01`} group by 1`),
    db.execute<{ k: string; paid: string }>(sql`
      select to_char(date_trunc('week', p.paid_on), 'YYYY-MM-DD') as k, sum(p.amount) as paid
      from order_payments p join orders o on o.id = p.order_id
      where ${live} and p.paid_on >= ${firstWeek} group by 1`),
    db.execute<{ k: string; paid: string }>(sql`
      select to_char(p.paid_on, 'YYYY') as k, sum(p.amount) as paid
      from order_payments p join orders o on o.id = p.order_id
      where ${live} and p.paid_on >= ${`${firstYear}-01-01`} group by 1`),
    db.execute<{ blocked: boolean; members: string }>(sql`
      select exists(select 1 from studio_days where studio_id = ${studioId}) as blocked,
             (select count(*) from studio_members where studio_id = ${studioId}) as members`),
  ]);

  const fill = (keys: string[], rows: { k: string; paid: string }[]) => {
    const m = new Map(rows.map((r) => [r.k, Number(r.paid)]));
    return keys.map((k) => ({ key: k, paid: m.get(k) ?? 0 }));
  };
  const monthKeys = Array.from({ length: 12 }, (_, i) => addMonths(firstMonth, i));
  const weekKeys = Array.from({ length: 12 }, (_, i) => addDays(firstWeek, i * 7));
  const yearKeys = Array.from({ length: 5 }, (_, i) => String(Number(firstYear) + i));

  const debt = debtRows.rows.map(lite);
  const overdue = debt.filter((o) => o.date < today);
  const mtd = Number(money.rows[0].mtd);
  const prev = Number(money.rows[0].prev);
  const c = counts.rows[0];

  return {
    today,
    month: { paid: mtd, prevPaid: prev, deltaPct: prev > 0 ? Math.round(((mtd - prev) / prev) * 100) : null },
    debt: {
      total: debt.reduce((s, o) => s + o.balance, 0),
      count: debt.length,
      overdue: { count: overdue.length, total: overdue.reduce((s, o) => s + o.balance, 0) },
      items: debt.slice(0, 5),
    },
    next7: next7.rows.map(lite),
    next30Count: Number(c.next30),
    thisWeekCount: Number(c.week),
    revenue: { months: fill(monthKeys, months.rows), weeks: fill(weekKeys, weeks.rows), years: fill(yearKeys, years.rows) },
    setup: { hasOrders: Number(c.total) > 0, hasBlockedDay: Boolean(setup.rows[0].blocked), hasTeam: Number(setup.rows[0].members) > 1 },
    monthDays: monthDates(month).length,
  };
}
