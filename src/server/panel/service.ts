import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { addDays, todayISO } from "@/lib/dates";
import { db, schema } from "../db";
import { HttpError, clientIp } from "../http";
import { limit } from "../ratelimit";
import type { TelegramUser, VerifyFail } from "../telegram/signature";
import { audit, memberships, startPanelSession, upsertTelegramUser, type PanelUser } from "./auth";

export const FOUNDING_TRIAL_DAYS = 90;

const AUTH_FAIL: Record<VerifyFail, string> = {
  missing: "Telegram maʼlumoti kelmadi. Ilovani qayta oching.",
  malformed: "Telegram maʼlumoti notoʻgʻri. Ilovani qayta oching.",
  bad_hash: "Telegram imzosi tasdiqlanmadi. Ilovani qayta oching.",
  expired: "Kirish muddati tugagan. Ilovani qayta oching.",
};
export const authError = (reason: VerifyFail) => new HttpError(401, `tg_${reason}`, AUTH_FAIL[reason]);

/* Local/E2E fake login. Never on Vercel, whatever the env says. */
export const devLoginEnabled = () => process.env.PANEL_DEV_LOGIN === "1" && !process.env.VERCEL;

export const authRateLimit = (req: NextRequest) => limit(`panel:auth:${clientIp(req)}`, 60, 3600);

export async function signIn(tg: TelegramUser, req: NextRequest) {
  const userId = await upsertTelegramUser(tg);
  await startPanelSession(userId, req.headers.get("user-agent"));
  return userId;
}

export async function mePayload(user: Pick<PanelUser, "id">) {
  const [u] = await db
    .select({ id: schema.users.id, name: schema.users.name, username: schema.users.telegramUsername, photoUrl: schema.users.photoUrl })
    .from(schema.users)
    .where(eq(schema.users.id, user.id));
  const studios = await memberships(user.id);
  return { user: { ...u, name: u.name ?? "Foydalanuvchi" }, studios };
}

/* ── onboarding: one screen, no steps (MVP-SCOPE S1) ── */
export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Kamida 2 ta belgi")
    .max(60, "Koʻpi bilan 60 ta belgi"),
  category: z.enum(["dekor", "floristika"], { error: "Yoʻnalishni tanlang" }),
  dailyCapacity: z.number().int().min(1, "Kamida 1").max(20, "Koʻpi bilan 20"),
});

export async function createStudio(userId: string, input: z.infer<typeof onboardingSchema>) {
  return db.transaction(async (tx) => {
    // serialise per user: two fast taps on "Boshlash" must not race past the check below
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"onboarding:" + userId}))`);
    // One owned studio per account in v1 — a second "Boshlash" tap must not create a twin
    const [owned] = await tx
      .select({ id: schema.studioMembers.studioId })
      .from(schema.studioMembers)
      .where(and(eq(schema.studioMembers.userId, userId), eq(schema.studioMembers.role, "owner")))
      .limit(1);
    if (owned) throw new HttpError(409, "studio_exists", "Sizda allaqachon studiya bor", { studioId: owned.id });

    const [studio] = await tx
      .insert(schema.studios)
      .values({ ...input, trialEndsAt: addDays(todayISO(), FOUNDING_TRIAL_DAYS) })
      .returning({ id: schema.studios.id, name: schema.studios.name, category: schema.studios.category, dailyCapacity: schema.studios.dailyCapacity });
    await tx.insert(schema.studioMembers).values({ studioId: studio.id, userId, role: "owner" });
    await audit(tx, { studioId: studio.id, actorId: userId, entity: "studio", entityId: studio.id, action: "create", diff: input });
    return { ...studio, role: "owner" as const };
  });
}
