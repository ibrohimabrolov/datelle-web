import "server-only";
import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db, schema } from "./db";
import type { Category, Filters, Status, VendorHit } from "@/data/catalog";
import { DISTRICTS, districtSlug } from "@/data/catalog";

const { vendors: v, vendorDays: vd } = schema;

/* Day status from a vendor_days row (missing row = empty day) */
export const statusSql = sql<Status>`case
  when coalesce(${vd.blocked}, false) or coalesce(${vd.booked}, 0) >= ${v.dailyCapacity} then 'busy'
  when coalesce(${vd.booked}, 0) = ${v.dailyCapacity} - 1 then 'few'
  else 'free' end`;
const freeSql = sql`(not coalesce(${vd.blocked}, false) and coalesce(${vd.booked}, 0) < ${v.dailyCapacity})`;

type AttrFilters = Omit<Filters, "sana" | "saralash">;

/* Vendor attribute filters (everything except the date) */
function attrWhere(f: AttrFilters): SQL[] {
  const w: SQL[] = [eq(v.status, "active"), eq(v.category, f.tur)];
  if (f.tadbir !== "all") w.push(sql`${f.tadbir} = any(${v.events})`);
  if (f.tuman !== "all") {
    const name = DISTRICTS.find((d) => districtSlug(d) === f.tuman);
    if (name) w.push(eq(v.district, name));
  }
  if (f.byudjet) w.push(lte(v.priceFrom, f.byudjet));
  if (f.chips.includes("tekshirilgan")) w.push(eq(v.verified, true));
  if (f.chips.includes("reyting")) w.push(gte(v.rating, 4.5));
  if (f.chips.includes("tez")) w.push(lte(v.responseHours, 2));
  return w;
}

const ORDER = {
  tavsiya: [asc(v.rank), asc(v.name)],
  arzon: [asc(v.priceFrom), asc(v.rank)],
  qimmat: [desc(v.priceFrom), asc(v.rank)],
  reyting: [desc(v.rating), desc(v.reviewsCount), asc(v.rank)],
} as const;

export async function searchVendors(f: Filters, page: { limit: number; offset: number }) {
  const where = and(...attrWhere(f), freeSql);
  const join = and(eq(vd.vendorId, v.id), eq(vd.day, f.sana));
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        slug: v.slug, name: v.name, category: v.category, district: v.district, rating: v.rating, reviews: v.reviewsCount,
        priceFrom: v.priceFrom, verified: v.verified, imageKey: v.imageKey, status: statusSql,
      })
      .from(v)
      .leftJoin(vd, join)
      .where(where)
      .orderBy(...ORDER[f.saralash])
      .limit(page.limit)
      .offset(page.offset),
    db.select({ total: sql<number>`count(*)::int` }).from(v).leftJoin(vd, join).where(where),
  ]);
  return { total, items: items as VendorHit[] };
}

/* How many matching vendors are free on each day of [from, from+days) */
export async function availabilitySummary(f: AttrFilters, from: string, days: number) {
  const rows = await db.execute<{ day: string; count: number }>(sql`
    with dates as (select d::date as day from generate_series(${from}::date, ${from}::date + ${days - 1}::int, interval '1 day') d),
         cand as (select ${v.id} as id, ${v.dailyCapacity} as cap from ${v} where ${and(...attrWhere(f))})
    select to_char(dates.day, 'YYYY-MM-DD') as day,
           count(cand.id) filter (where not coalesce(vd.blocked, false) and coalesce(vd.booked, 0) < cand.cap)::int as count
    from dates
    cross join cand
    left join ${vd} vd on vd.vendor_id = cand.id and vd.day = dates.day
    group by dates.day order by dates.day`);
  const map = new Map(rows.rows.map((r) => [r.day, r.count]));
  // dates with no candidates at all still need a zero
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);
    return { date: day, count: map.get(day) ?? 0 };
  });
}

export async function vendorBySlugDb(slug: string) {
  const [row] = await db.select().from(v).where(and(eq(v.slug, slug), eq(v.status, "active"))).limit(1);
  return row ?? null;
}

export async function vendorCalendar(vendorId: string, cap: number, from: string, to: string) {
  const rows = await db
    .select({ day: vd.day, booked: vd.booked, blocked: vd.blocked })
    .from(vd)
    .where(and(eq(vd.vendorId, vendorId), gte(vd.day, from), lte(vd.day, to)));
  const map = new Map(rows.map((r) => [r.day, r]));
  const out: { date: string; status: Status }[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const r = map.get(day);
    const status: Status = !r ? "free" : r.blocked || r.booked >= cap ? "busy" : r.booked === cap - 1 ? "few" : "free";
    out.push({ date: day, status });
  }
  return out;
}

export async function dayStatus(vendorId: string, cap: number, day: string): Promise<Status> {
  const [r] = await db.select().from(vd).where(and(eq(vd.vendorId, vendorId), eq(vd.day, day))).limit(1);
  if (!r) return "free";
  return r.blocked || r.booked >= cap ? "busy" : r.booked === cap - 1 ? "few" : "free";
}

export type { Category };
