import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { HttpError } from "./http";
import { limit } from "./ratelimit";
import { dayStatus, vendorBySlugDb } from "./catalog";
import type { SessionUser } from "./auth";
import { EVENT_TYPES } from "@/data/catalog";
import { isBookable, isISODate, todayISO } from "@/lib/dates";
import { addWorkingHours } from "@/lib/workhours";
import { adjustSlot } from "./admin";

const { requests: r, requestEvents: ev, vendors: v, packages: p } = schema;
export const createSchema = z
  .object({
    type: z.enum(["booking", "quote"]),
    vendor: z.string().min(1).max(80),
    date: z.string().refine(isISODate, "Sana notoʻgʻri"),
    packageId: z.string().max(120).optional(),
    eventType: z.enum(EVENT_TYPES.map((e) => e.slug) as [string, ...string[]]).optional(),
    guests: z.number().int().min(1).max(5000).optional(),
    venue: z.string().trim().max(200).optional(),
    budget: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(2000).optional(),
    name: z.string().trim().min(2, "Ismingizni kiriting").max(60),
  })
  .refine((x) => x.type === "quote" || !!x.packageId, { message: "Paketni tanlang", path: ["packageId"] });

async function uniqueCode(type: "booking" | "quote") {
  for (let i = 0; i < 5; i++) {
    const code = `DT-${type === "booking" ? "B" : "R"}-${randomInt(100_000, 1_000_000)}`;
    const [hit] = await db.select({ id: r.id }).from(r).where(eq(r.code, code)).limit(1);
    if (!hit) return code;
  }
  throw new Error("could not allocate request code");
}

export async function createRequest(user: SessionUser, input: z.infer<typeof createSchema>) {
  await limit(`req:user:${user.id}`, 10, 86_400, "Bugun juda koʻp soʻrov yubordingiz. Ertaga qayta urinib koʻring.");

  if (!isBookable(input.date, todayISO())) throw new HttpError(422, "date_out_of_range", "Bu sanaga bron qilib boʻlmaydi", { fields: { date: "Ertadan boshlab bir yil ichidagi sana tanlang" } });
  const vendor = await vendorBySlugDb(input.vendor);
  if (!vendor) throw new HttpError(404, "vendor_not_found", "Studiya topilmadi");

  let pkg: typeof p.$inferSelect | undefined;
  if (input.packageId) {
    [pkg] = await db.select().from(p).where(and(eq(p.id, input.packageId), eq(p.vendorId, vendor.id))).limit(1);
    if (!pkg) throw new HttpError(422, "package_invalid", "Paket topilmadi", { fields: { packageId: "Paketni qayta tanlang" } });
  }
  if ((await dayStatus(vendor.id, vendor.dailyCapacity, input.date)) === "busy")
    throw new HttpError(409, "day_busy", "Bu kun studiya band. Boshqa sanani tanlang.");

  const now = new Date();
  const respondBy = input.type === "booking" ? addWorkingHours(now, 6) : new Date(now.getTime() + 24 * 3600_000);
  const price = pkg?.price ?? null;
  const deposit = pkg ? Math.round((pkg.price * pkg.depositPct) / 100 / 1000) * 1000 : null;

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(r)
        .values({
          code: await uniqueCode(input.type),
          type: input.type,
          userId: user.id,
          vendorId: vendor.id,
          packageId: pkg?.id,
          eventDate: input.date,
          eventType: input.eventType,
          guests: input.guests,
          venue: input.venue || null,
          budget: input.budget || null,
          notes: input.notes || null,
          contactName: input.name,
          contactPhone: user.phone,
          price,
          deposit,
          respondBy,
        })
        .returning({ id: r.id });
      await tx.insert(ev).values({ requestId: row.id, toStatus: "pending", actor: "client" });
      if (!user.name) await tx.update(schema.users).set({ name: input.name }).where(eq(schema.users.id, user.id));
      return row.id;
    });
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") {
      const [open] = await db
        .select({ id: r.id })
        .from(r)
        .where(and(eq(r.userId, user.id), eq(r.vendorId, vendor.id), eq(r.eventDate, input.date), inArray(r.status, ["pending", "confirmed", "paid"])))
        .limit(1);
      throw new HttpError(409, "duplicate", "Bu studiyaga shu sana uchun soʻrovingiz bor", { id: open?.id });
    }
    throw e;
  }
}

/* Lazy expiry — no cron needed for correctness; a job can run the same update later */
async function expireStale(userId: string) {
  const stale = await db
    .update(r)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(r.userId, userId), eq(r.status, "pending"), lt(r.respondBy, new Date())))
    .returning({ id: r.id });
  if (stale.length) await db.insert(ev).values(stale.map((s) => ({ requestId: s.id, fromStatus: "pending" as const, toStatus: "expired" as const, actor: "system" as const })));
}

const view = {
  id: r.id, code: r.code, type: r.type, status: r.status, eventDate: r.eventDate, eventType: r.eventType, guests: r.guests,
  venue: r.venue, budget: r.budget, price: r.price, deposit: r.deposit, respondBy: r.respondBy, createdAt: r.createdAt,
  contactName: r.contactName,
  vendor: { slug: v.slug, name: v.name, category: v.category, district: v.district, imageKey: v.imageKey, responseHours: v.responseHours },
  packageTitle: p.title,
};

export async function listRequests(userId: string) {
  await expireStale(userId);
  return db.select(view).from(r).innerJoin(v, eq(v.id, r.vendorId)).leftJoin(p, eq(p.id, r.packageId)).where(eq(r.userId, userId)).orderBy(desc(r.createdAt)).limit(100);
}

export async function getRequest(userId: string, id: string) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "not_found", "Soʻrov topilmadi");
  await expireStale(userId);
  const [row] = await db.select(view).from(r).innerJoin(v, eq(v.id, r.vendorId)).leftJoin(p, eq(p.id, r.packageId)).where(and(eq(r.id, id), eq(r.userId, userId))).limit(1);
  if (!row) throw new HttpError(404, "not_found", "Soʻrov topilmadi");
  const events = await db.select({ toStatus: ev.toStatus, actor: ev.actor, createdAt: ev.createdAt }).from(ev).where(eq(ev.requestId, id)).orderBy(ev.createdAt);
  return { ...row, events };
}

export async function cancelRequest(userId: string, id: string) {
  const cur = await getRequest(userId, id);
  if (!["pending", "confirmed"].includes(cur.status)) throw new HttpError(409, "not_cancellable", "Bu soʻrovni bekor qilib boʻlmaydi");
  const [row] = await db
    .update(r)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(r.id, id), eq(r.userId, userId), inArray(r.status, ["pending", "confirmed"])))
    .returning({ id: r.id, vendorId: r.vendorId });
  if (!row) throw new HttpError(409, "not_cancellable", "Bu soʻrovni bekor qilib boʻlmaydi");
  await db.insert(ev).values({ requestId: id, fromStatus: cur.status, toStatus: "cancelled", actor: "client" });
  if (cur.status === "confirmed") await adjustSlot(db, row.vendorId, cur.eventDate, -1); // give the vendor's slot back
  return getRequest(userId, id);
}

export type RequestView = Awaited<ReturnType<typeof getRequest>>;
