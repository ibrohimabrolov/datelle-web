import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db, schema } from "../db";
import { HttpError } from "../http";
import type { TelegramUser } from "../telegram/signature";

/* Datelle Studio sessions — separate cookie and scope from the marketplace (dt_session).
   Telegram Web/Desktop opens Mini Apps in an iframe, so in production the cookie is
   SameSite=None + Partitioned (CHIPS). CSRF stays closed by assertSameOrigin on every write. */
export const PANEL_COOKIE = "dt_panel";
export const STUDIO_HEADER = "x-studio-id";
const SESSION_DAYS = 30;
const DAY = 86_400_000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const secure = process.env.NODE_ENV === "production";
const cookieOpts = (expires: Date) =>
  ({ httpOnly: true, secure, sameSite: secure ? "none" : "lax", partitioned: secure, path: "/", expires }) as const;

export type PanelUser = { id: string; name: string; username: string | null; photoUrl: string | null; telegramId: number | null };
export type MemberRole = "owner" | "manager";
export type StudioCtx = {
  user: PanelUser;
  studio: { id: string; name: string; category: "dekor" | "floristika"; dailyCapacity: number };
  role: MemberRole;
};

const displayName = (u: TelegramUser) => [u.first_name, u.last_name].filter(Boolean).join(" ").trim().slice(0, 80) || "Foydalanuvchi";

export async function upsertTelegramUser(tg: TelegramUser) {
  const values = {
    telegramId: tg.id,
    name: displayName(tg),
    telegramUsername: tg.username ?? null,
    photoUrl: tg.photo_url ?? null,
  };
  const [u] = await db
    .insert(schema.users)
    .values(values)
    .onConflictDoUpdate({ target: schema.users.telegramId, set: { name: values.name, telegramUsername: values.telegramUsername, photoUrl: values.photoUrl } })
    .returning({ id: schema.users.id });
  return u.id;
}

export async function startPanelSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt, scope: "panel", userAgent: userAgent?.slice(0, 200) });
  (await cookies()).set(PANEL_COOKIE, token, cookieOpts(expiresAt));
}

export async function endPanelSession() {
  const jar = await cookies();
  const token = jar.get(PANEL_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(and(eq(schema.sessions.id, sha256(token)), eq(schema.sessions.scope, "panel")));
  jar.set(PANEL_COOKIE, "", cookieOpts(new Date(0)));
}

export async function currentPanelUser(): Promise<PanelUser | null> {
  const token = (await cookies()).get(PANEL_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      username: schema.users.telegramUsername,
      photoUrl: schema.users.photoUrl,
      telegramId: schema.users.telegramId,
      sid: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), eq(schema.sessions.scope, "panel"), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;

  // sliding expiry once less than half the lifetime is left
  if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
    await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.id, row.sid));
    try {
      (await cookies()).set(PANEL_COOKIE, token, cookieOpts(expiresAt));
    } catch {
      /* read-only context — the next API call refreshes the cookie */
    }
  }
  return { id: row.id, name: row.name ?? "Foydalanuvchi", username: row.username, photoUrl: row.photoUrl, telegramId: row.telegramId };
}

export async function requirePanelUser() {
  const u = await currentPanelUser();
  if (!u) throw new HttpError(401, "unauthorized", "Qayta kiring");
  return u;
}

export async function memberships(userId: string) {
  return db
    .select({
      id: schema.studios.id,
      name: schema.studios.name,
      category: schema.studios.category,
      dailyCapacity: schema.studios.dailyCapacity,
      role: schema.studioMembers.role,
    })
    .from(schema.studioMembers)
    .innerJoin(schema.studios, eq(schema.studios.id, schema.studioMembers.studioId))
    .where(eq(schema.studioMembers.userId, userId))
    .orderBy(asc(schema.studioMembers.createdAt));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Every /api/panel/* handler starts here (Tech §3).
   Studio = x-studio-id header if sent, otherwise the user's first membership.
   Not a member → 404 (we never confirm another studio exists). Wrong role → 403. */
export async function requireStudio(req: NextRequest, opts: { role?: MemberRole } = {}): Promise<StudioCtx> {
  const user = await requirePanelUser();
  const wanted = req.headers.get(STUDIO_HEADER);
  if (wanted && !UUID_RE.test(wanted)) throw new HttpError(404, "not_found", "Studiya topilmadi");

  const list = await memberships(user.id);
  const m = wanted ? list.find((s) => s.id === wanted) : list[0];
  if (!m) {
    if (!wanted && list.length === 0) throw new HttpError(409, "no_studio", "Avval studiya yarating");
    throw new HttpError(404, "not_found", "Studiya topilmadi");
  }
  if (opts.role === "owner" && m.role !== "owner") throw new HttpError(403, "forbidden", "Bu amal faqat studiya egasiga ruxsat etilgan");

  const { role, ...studio } = m;
  return { user, studio, role };
}

/* Audit — append-only (Tech §2 studio_events) */
export async function audit(
  tx: Pick<typeof db, "insert">,
  e: { studioId: string; actorId: string | null; entity: string; entityId: string; action: string; diff?: Record<string, unknown> },
) {
  await tx.insert(schema.studioEvents).values(e);
}
