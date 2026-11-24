import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { SITE_URL } from "@/config/site";
import { db, schema } from "../db";
import { HttpError } from "../http";
import { audit, type PanelUser, type StudioCtx } from "./auth";

/* Studio settings, team and invites (Tech §2–§4, MVP-SCOPE S6). */

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const INVITE_DAYS = 7;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

/* ── studio ── */
export const studioPatch = z
  .object({
    name: z.string().trim().min(2, "Kamida 2 ta belgi").max(60, "Koʻpi bilan 60 ta belgi"),
    category: z.enum(["dekor", "floristika"], { error: "Yoʻnalishni tanlang" }),
    dailyCapacity: z.number().int().min(1, "Kamida 1").max(20, "Koʻpi bilan 20"),
  })
  .partial();

export async function studioDetails(ctx: StudioCtx) {
  const [s] = await db
    .select({ id: schema.studios.id, name: schema.studios.name, category: schema.studios.category, dailyCapacity: schema.studios.dailyCapacity, plan: schema.studios.plan, trialEndsAt: schema.studios.trialEndsAt })
    .from(schema.studios)
    .where(eq(schema.studios.id, ctx.studio.id));
  // Sozlamalar · menejer shows who owns the studio (Figma 596:11644)
  const [owner] = await db
    .select({ name: schema.users.name, username: schema.users.telegramUsername })
    .from(schema.studioMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.studioMembers.userId))
    .where(and(eq(schema.studioMembers.studioId, ctx.studio.id), eq(schema.studioMembers.role, "owner")));
  return { studio: s, role: ctx.role, owner: owner ? { name: owner.name ?? "Egasi", username: owner.username } : null };
}

export async function patchStudio(ctx: StudioCtx, input: z.infer<typeof studioPatch>) {
  const before = (await studioDetails(ctx)).studio;
  const changed = Object.fromEntries(Object.entries(input).filter(([k, v]) => v !== undefined && before[k as keyof typeof before] !== v));
  if (Object.keys(changed).length) {
    await db.transaction(async (tx) => {
      await tx.update(schema.studios).set({ ...changed, updatedAt: new Date() }).where(eq(schema.studios.id, ctx.studio.id));
      await audit(tx, {
        studioId: ctx.studio.id,
        actorId: ctx.user.id,
        entity: "studio",
        entityId: ctx.studio.id,
        action: "update",
        diff: Object.fromEntries(Object.keys(changed).map((k) => [k, [before[k as keyof typeof before], changed[k]]])),
      });
    });
  }
  return studioDetails({ ...ctx, studio: { ...ctx.studio, ...changed } });
}

/* ── members ── */
export async function listMembers(ctx: StudioCtx) {
  const { rows } = await db.execute<{ user_id: string; name: string | null; username: string | null; role: "owner" | "manager"; reminders_on: boolean; joined: string; last_seen: string | null }>(sql`
    select m.user_id, u.name, u.telegram_username as username, m.role, m.reminders_on, m.created_at as joined,
           (select max(s.created_at) from sessions s where s.user_id = m.user_id and s.scope = 'panel') as last_seen
    from studio_members m join users u on u.id = m.user_id
    where m.studio_id = ${ctx.studio.id}
    order by (m.role = 'owner') desc, m.created_at`);
  return {
    members: rows.map((r) => ({
      userId: r.user_id,
      name: r.name ?? "Foydalanuvchi",
      username: r.username,
      role: r.role,
      remindersOn: r.reminders_on,
      joinedAt: r.joined,
      lastSeenAt: r.last_seen,
      isYou: r.user_id === ctx.user.id,
    })),
  };
}

/* Owner removes a manager. The owner can't remove themselves (a studio always has one). Not a member → 404. */
export async function removeMember(ctx: StudioCtx, userId: string) {
  if (userId === ctx.user.id) throw new HttpError(409, "cannot_remove_self", "Oʻzingizni olib tashlay olmaysiz");
  const [m] = await db
    .select({ role: schema.studioMembers.role, name: schema.users.name })
    .from(schema.studioMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.studioMembers.userId))
    .where(and(eq(schema.studioMembers.studioId, ctx.studio.id), eq(schema.studioMembers.userId, userId)));
  if (!m) throw new HttpError(404, "not_found", "Aʼzo topilmadi");
  if (m.role === "owner") throw new HttpError(409, "cannot_remove_owner", "Egasini olib tashlab boʻlmaydi");
  await db.transaction(async (tx) => {
    await tx.delete(schema.studioMembers).where(and(eq(schema.studioMembers.studioId, ctx.studio.id), eq(schema.studioMembers.userId, userId)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "member", entityId: userId, action: "delete", diff: { name: m.name, role: m.role } });
  });
  return listMembers(ctx);
}

/* A manager leaves the studio themselves ("Jamoani tark etish"). The owner can't — a studio always has one.
   Audited as member/leave, so the "egasi sizni chiqardi" screen (member/delete) doesn't fire. */
export async function leaveStudio(ctx: StudioCtx) {
  if (ctx.role === "owner") throw new HttpError(409, "owner_cannot_leave", "Egasi studiyani tark eta olmaydi");
  await db.transaction(async (tx) => {
    await tx.delete(schema.studioMembers).where(and(eq(schema.studioMembers.studioId, ctx.studio.id), eq(schema.studioMembers.userId, ctx.user.id)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "member", entityId: ctx.user.id, action: "leave", diff: { role: ctx.role } });
  });
  return { left: true };
}

export const meMemberPatch = z.object({ remindersOn: z.boolean() });
export async function setMyReminders(ctx: StudioCtx, remindersOn: boolean) {
  await db
    .update(schema.studioMembers)
    .set({ remindersOn })
    .where(and(eq(schema.studioMembers.studioId, ctx.studio.id), eq(schema.studioMembers.userId, ctx.user.id)));
  return { remindersOn };
}

/* ── invites: one-time link, 7 days, only the hash is stored ── */
export function inviteLink(token: string) {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  // ?start= opens the bot chat → /start inv_… → the bot answers with the studio name and a Mini App button
  // carrying ?taklif=. (?startapp= only works when a Main Mini App is set up in BotFather — without it
  // Telegram just opens the chat, the person taps the menu button and lands in their own studio.)
  return bot ? `https://t.me/${bot}?start=inv_${token}` : `${SITE_URL}/panel/taklif?t=${token}`;
}

export async function createInvite(ctx: StudioCtx) {
  const token = randomBytes(18).toString("base64url"); // 24 chars, URL-safe
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
  const [inv] = await db
    .insert(schema.studioInvites)
    .values({ studioId: ctx.studio.id, role: "manager", tokenHash: sha256(token), createdBy: ctx.user.id, expiresAt })
    .returning({ id: schema.studioInvites.id });
  await audit(db, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "invite", entityId: inv.id, action: "create", diff: { role: "manager", expiresAt } });
  return { id: inv.id, link: inviteLink(token), expiresAt };
}

export async function listInvites(ctx: StudioCtx) {
  const rows = await db
    .select({ id: schema.studioInvites.id, expiresAt: schema.studioInvites.expiresAt, createdAt: schema.studioInvites.createdAt })
    .from(schema.studioInvites)
    .where(and(eq(schema.studioInvites.studioId, ctx.studio.id), isNull(schema.studioInvites.usedAt), gt(schema.studioInvites.expiresAt, new Date())))
    .orderBy(desc(schema.studioInvites.createdAt));
  return { invites: rows };
}

export async function revokeInvite(ctx: StudioCtx, id: string) {
  const r = await db
    .update(schema.studioInvites)
    .set({ expiresAt: new Date() })
    .where(and(eq(schema.studioInvites.id, id), eq(schema.studioInvites.studioId, ctx.studio.id), isNull(schema.studioInvites.usedAt)))
    .returning({ id: schema.studioInvites.id });
  if (!r.length) throw new HttpError(404, "not_found", "Taklif topilmadi");
  return listInvites(ctx);
}

async function findInvite(token: string) {
  if (!TOKEN_RE.test(token)) throw new HttpError(404, "invite_invalid", "Taklif linki notoʻgʻri");
  const [inv] = await db
    .select({
      id: schema.studioInvites.id,
      studioId: schema.studioInvites.studioId,
      role: schema.studioInvites.role,
      expiresAt: schema.studioInvites.expiresAt,
      usedAt: schema.studioInvites.usedAt,
      usedBy: schema.studioInvites.usedBy,
      studioName: schema.studios.name,
      inviter: schema.users.name,
    })
    .from(schema.studioInvites)
    .innerJoin(schema.studios, eq(schema.studios.id, schema.studioInvites.studioId))
    .leftJoin(schema.users, eq(schema.users.id, schema.studioInvites.createdBy))
    .where(eq(schema.studioInvites.tokenHash, sha256(token)));
  if (!inv) throw new HttpError(404, "invite_invalid", "Taklif linki notoʻgʻri");
  return inv;
}

/* For the bot's /start inv_… answer: studio + inviter, no user needed. null = no such link. */
export type BotInvite = { studio: string; inviter: string | null; status: "ok" | "used" | "expired" } | null;
export async function inviteForBot(token: string): Promise<BotInvite> {
  const inv = await findInvite(token).catch((e) => {
    if (e instanceof HttpError && e.status === 404) return null;
    throw e;
  });
  if (!inv) return null;
  return { studio: inv.studioName, inviter: inv.inviter?.split(" ")[0] ?? null, status: inv.usedAt ? "used" : inv.expiresAt < new Date() ? "expired" : "ok" };
}

/* What the invitee sees before joining (Figma S0 · Taklif) */
export async function previewInvite(user: PanelUser, token: string) {
  const inv = await findInvite(token);
  const [member] = await db
    .select({ role: schema.studioMembers.role })
    .from(schema.studioMembers)
    .where(and(eq(schema.studioMembers.studioId, inv.studioId), eq(schema.studioMembers.userId, user.id)));
  const status = member ? "member" : inv.usedAt ? "used" : inv.expiresAt < new Date() ? "expired" : "ok";
  return { studio: { id: inv.studioId, name: inv.studioName }, inviter: inv.inviter?.split(" ")[0] ?? null, role: inv.role, status };
}

/* One-time: the row is claimed atomically (used_at is null → set), so two people can't use one link */
export async function acceptInvite(user: PanelUser, token: string) {
  const inv = await findInvite(token);
  const [already] = await db
    .select({ role: schema.studioMembers.role })
    .from(schema.studioMembers)
    .where(and(eq(schema.studioMembers.studioId, inv.studioId), eq(schema.studioMembers.userId, user.id)));
  if (already) return { studioId: inv.studioId, joined: false };
  if (inv.usedAt) throw new HttpError(410, "invite_used", "Bu link allaqachon ishlatilgan. Egasidan yangisini soʻrang.");
  if (inv.expiresAt < new Date()) throw new HttpError(410, "invite_expired", "Link muddati tugagan. Egasidan yangisini soʻrang.");

  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(schema.studioInvites)
      .set({ usedAt: new Date(), usedBy: user.id })
      .where(and(eq(schema.studioInvites.id, inv.id), isNull(schema.studioInvites.usedAt), gt(schema.studioInvites.expiresAt, new Date())))
      .returning({ id: schema.studioInvites.id });
    if (!claimed.length) throw new HttpError(410, "invite_used", "Bu link allaqachon ishlatilgan. Egasidan yangisini soʻrang.");
    await tx.insert(schema.studioMembers).values({ studioId: inv.studioId, userId: user.id, role: inv.role });
    await audit(tx, { studioId: inv.studioId, actorId: user.id, entity: "member", entityId: user.id, action: "create", diff: { role: inv.role, via: "invite", inviteId: inv.id } });
  });
  return { studioId: inv.studioId, joined: true };
}
