import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, schema } from "./db";
import { HttpError } from "./http";
import { limit } from "./ratelimit";
import { todayISO } from "@/lib/dates";

/* ───────────────────────────────────────────────
   Admin — one shared password (ADMIN_PASSWORD), stateless signed cookie.
   Changing the password logs every admin session out.
   ─────────────────────────────────────────────── */
export const ADMIN_COOKIE = "dt_admin";
const ADMIN_DAYS = 7;

const password = () => process.env.ADMIN_PASSWORD?.trim() || null;
const secret = (pw: string) => createHash("sha256").update(`datelle-admin:${pw}:${process.env.OTP_PEPPER ?? ""}`).digest();
const sign = (pw: string, exp: number) => createHmac("sha256", secret(pw)).update(`admin:${exp}`).digest("hex");
const same = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

function assertEnabled() {
  const pw = password();
  if (!pw) throw new HttpError(404, "admin_disabled", "Admin panel yoqilmagan");
  return pw;
}

export async function adminLogin(input: string, ip: string) {
  const pw = assertEnabled();
  await limit(`admin:ip:${ip}`, 5, 900, "Juda koʻp urinish. 15 daqiqadan keyin qayta urinib koʻring.");
  if (!same(input, pw)) throw new HttpError(401, "bad_password", "Parol notoʻgʻri");
  const exp = Date.now() + ADMIN_DAYS * 86_400_000;
  (await cookies()).set(ADMIN_COOKIE, `${exp}.${sign(pw, exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function requireAdmin() {
  const pw = assertEnabled();
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  const [expS, mac] = raw.split(".");
  const exp = Number(expS);
  if (!mac || !Number.isFinite(exp) || exp < Date.now() || !same(mac, sign(pw, exp)))
    throw new HttpError(401, "admin_unauthorized", "Kirish talab qilinadi");
}

/* ── Dashboard ── */
const { requests: r, requestEvents: ev, vendors: v, packages: p, vendorDays: vd, partnerApplications: pa, leads: l, users: u } = schema;

async function expireAll() {
  const stale = await db
    .update(r)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(r.status, "pending"), lt(r.respondBy, new Date())))
    .returning({ id: r.id });
  if (stale.length) await db.insert(ev).values(stale.map((s) => ({ requestId: s.id, fromStatus: "pending" as const, toStatus: "expired" as const, actor: "system" as const })));
}

export async function adminStats() {
  await expireAll();
  const since = new Date(Date.now() - 7 * 86_400_000);
  const startToday = new Date(`${todayISO()}T00:00:00+05:00`);
  const [byStatus, [today], [week], [apps], [lds], [usersN], [vendorsN]] = await Promise.all([
    db.select({ status: r.status, n: count() }).from(r).groupBy(r.status),
    db.select({ n: count() }).from(r).where(gte(r.createdAt, startToday)),
    db.select({ n: count() }).from(r).where(gte(r.createdAt, since)),
    db.select({ n: count() }).from(pa).where(eq(pa.status, "new")),
    db.select({ n: count() }).from(l).where(eq(l.handled, false)),
    db.select({ n: count() }).from(u),
    db.select({ n: count() }).from(v).where(eq(v.status, "active")),
  ]);
  const s = Object.fromEntries(byStatus.map((x) => [x.status, x.n])) as Record<string, number>;
  const total = byStatus.reduce((a, x) => a + x.n, 0);
  const answered = (s.confirmed ?? 0) + (s.paid ?? 0) + (s.completed ?? 0);
  const decided = answered + (s.declined ?? 0) + (s.expired ?? 0);
  return {
    today: today.n,
    week: week.n,
    total,
    pending: s.pending ?? 0,
    confirmed: s.confirmed ?? 0,
    paid: (s.paid ?? 0) + (s.completed ?? 0),
    acceptRate: decided ? Math.round((answered / decided) * 100) : null,
    newApplications: apps.n,
    openLeads: lds.n,
    users: usersN.n,
    activeVendors: vendorsN.n,
    byStatus: s,
  };
}

/* ── Requests ── */
export const REQUEST_FILTERS = ["open", "pending", "confirmed", "paid", "closed", "all"] as const;
const FILTER_STATUSES: Record<(typeof REQUEST_FILTERS)[number], (typeof schema.requestStatus.enumValues)[number][] | null> = {
  open: ["pending", "confirmed", "paid"],
  pending: ["pending"],
  confirmed: ["confirmed"],
  paid: ["paid", "completed"],
  closed: ["declined", "expired", "cancelled", "completed"],
  all: null,
};

export async function adminRequests(filter: (typeof REQUEST_FILTERS)[number], q: string) {
  await expireAll();
  const statuses = FILTER_STATUSES[filter];
  const term = q.trim();
  const where = and(
    statuses ? inArray(r.status, statuses) : undefined,
    term ? or(ilike(r.code, `%${term}%`), ilike(r.contactName, `%${term}%`), ilike(r.contactPhone, `%${term.replace(/\D/g, "") || term}%`), ilike(v.name, `%${term}%`)) : undefined,
  );
  return db
    .select({
      id: r.id, code: r.code, type: r.type, status: r.status, eventDate: r.eventDate, eventType: r.eventType, guests: r.guests,
      venue: r.venue, budget: r.budget, notes: r.notes, contactName: r.contactName, contactPhone: r.contactPhone,
      price: r.price, deposit: r.deposit, respondBy: r.respondBy, createdAt: r.createdAt,
      vendor: { id: v.id, slug: v.slug, name: v.name, category: v.category }, packageTitle: p.title,
    })
    .from(r)
    .innerJoin(v, eq(v.id, r.vendorId))
    .leftJoin(p, eq(p.id, r.packageId))
    .where(where)
    .orderBy(sql`case when ${r.status} = 'pending' then 0 else 1 end`, desc(r.createdAt))
    .limit(200);
}

/* Who may move a request where. Confirming takes one of the vendor's daily slots; leaving
   confirmed/paid gives it back. */
const NEXT: Partial<Record<string, string[]>> = {
  pending: ["confirmed", "declined"],
  confirmed: ["paid", "declined", "cancelled"],
  paid: ["completed", "cancelled"],
};
const HOLDS_SLOT = new Set(["confirmed", "paid", "completed"]);

export const transitionSchema = z.object({
  to: z.enum(["confirmed", "declined", "paid", "completed", "cancelled"]),
  note: z.string().trim().max(500).optional(),
});

export async function adminTransition(id: string, input: z.infer<typeof transitionSchema>) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "not_found", "Soʻrov topilmadi");
  await expireAll();
  return db.transaction(async (tx) => {
    const [cur] = await tx.select({ status: r.status, vendorId: r.vendorId, eventDate: r.eventDate }).from(r).where(eq(r.id, id)).for("update").limit(1);
    if (!cur) throw new HttpError(404, "not_found", "Soʻrov topilmadi");
    if (!NEXT[cur.status]?.includes(input.to)) throw new HttpError(409, "bad_transition", "Bu holatdan bunga oʻtkazib boʻlmaydi");

    await tx.update(r).set({ status: input.to, updatedAt: new Date() }).where(eq(r.id, id));
    await tx.insert(ev).values({ requestId: id, fromStatus: cur.status, toStatus: input.to, actor: "admin", note: input.note || null });

    const before = HOLDS_SLOT.has(cur.status);
    const after = HOLDS_SLOT.has(input.to);
    if (!before && after) await adjustSlot(tx, cur.vendorId, cur.eventDate, 1);
    if (before && !after) await adjustSlot(tx, cur.vendorId, cur.eventDate, -1);
    return { id, status: input.to };
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function adjustSlot(tx: Tx | typeof db, vendorId: string, day: string, delta: 1 | -1) {
  await tx
    .insert(vd)
    .values({ vendorId, day, booked: Math.max(0, delta) })
    .onConflictDoUpdate({ target: [vd.vendorId, vd.day], set: { booked: sql`greatest(0, ${vd.booked} + ${delta})` } });
}

/* ── Vendors ── */
export async function adminVendors() {
  const today = todayISO();
  const open = db
    .select({ vendorId: r.vendorId, n: count().as("n") })
    .from(r)
    .where(inArray(r.status, ["pending", "confirmed", "paid"]))
    .groupBy(r.vendorId)
    .as("open");
  return db
    .select({
      id: v.id, slug: v.slug, name: v.name, category: v.category, district: v.district, priceFrom: v.priceFrom,
      dailyCapacity: v.dailyCapacity, status: v.status, rating: v.rating, verified: v.verified,
      openRequests: sql<number>`coalesce(${open.n}, 0)::int`,
      busyNext30: sql<number>`(select count(*)::int from vendor_days d where d.vendor_id = ${v.id} and d.day >= ${today}::date and d.day < ${today}::date + 30 and (d.blocked or d.booked >= ${v.dailyCapacity}))`,
    })
    .from(v)
    .leftJoin(open, eq(open.vendorId, v.id))
    .orderBy(v.category, v.rank);
}

export const vendorPatchSchema = z
  .object({
    status: z.enum(["active", "hidden"]).optional(),
    dailyCapacity: z.number().int().min(1).max(20).optional(),
    priceFrom: z.number().int().min(100_000).max(1_000_000_000).optional(),
    verified: z.boolean().optional(),
  })
  .refine((x) => Object.keys(x).length > 0, "Oʻzgarish yoʻq");

export async function adminUpdateVendor(id: string, patch: z.infer<typeof vendorPatchSchema>) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "not_found", "Studiya topilmadi");
  const [row] = await db.update(v).set(patch).where(eq(v.id, id)).returning({ id: v.id });
  if (!row) throw new HttpError(404, "not_found", "Studiya topilmadi");
  return row;
}

export const dayPatchSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana notoʻgʻri"),
  blocked: z.boolean(),
});

export async function adminSetDay(vendorId: string, { day, blocked }: z.infer<typeof dayPatchSchema>) {
  if (!z.uuid().safeParse(vendorId).success) throw new HttpError(404, "not_found", "Studiya topilmadi");
  if (day < todayISO()) throw new HttpError(422, "past_day", "Oʻtgan kunni oʻzgartirib boʻlmaydi");
  await db
    .insert(vd)
    .values({ vendorId, day, blocked })
    .onConflictDoUpdate({ target: [vd.vendorId, vd.day], set: { blocked } });
  return { day, blocked };
}

export async function adminVendorDays(vendorId: string) {
  if (!z.uuid().safeParse(vendorId).success) throw new HttpError(404, "not_found", "Studiya topilmadi");
  const today = todayISO();
  return db
    .select({ day: vd.day, booked: vd.booked, blocked: vd.blocked })
    .from(vd)
    .where(and(eq(vd.vendorId, vendorId), gte(vd.day, today), lt(vd.day, sql`${today}::date + 62`)))
    .orderBy(vd.day);
}

/* ── Partner applications & leads ── */
export async function adminApplications() {
  return db.select().from(pa).orderBy(sql`case when ${pa.status} = 'new' then 0 when ${pa.status} = 'reviewing' then 1 else 2 end`, desc(pa.createdAt)).limit(200);
}

export const applicationPatchSchema = z.object({ status: z.enum(["new", "reviewing", "approved", "rejected"]) });

export async function adminUpdateApplication(id: string, { status }: z.infer<typeof applicationPatchSchema>) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "not_found", "Ariza topilmadi");
  const [row] = await db.update(pa).set({ status }).where(eq(pa.id, id)).returning({ id: pa.id, status: pa.status });
  if (!row) throw new HttpError(404, "not_found", "Ariza topilmadi");
  return row;
}

export async function adminLeads() {
  return db.select().from(l).orderBy(l.handled, desc(l.createdAt)).limit(200);
}

export const leadPatchSchema = z.object({ handled: z.boolean() });

export async function adminUpdateLead(id: string, { handled }: z.infer<typeof leadPatchSchema>) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "not_found", "Lid topilmadi");
  const [row] = await db.update(l).set({ handled }).where(eq(l.id, id)).returning({ id: l.id, handled: l.handled });
  if (!row) throw new HttpError(404, "not_found", "Lid topilmadi");
  return row;
}
