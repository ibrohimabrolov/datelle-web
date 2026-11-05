import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "./db";
import { HttpError } from "./http";
import { limit } from "./ratelimit";
import { echoCode, sendSms } from "./sms";

export const SESSION_COOKIE = "dt_session";
const SESSION_DAYS = 30;
const OTP_TTL_SEC = 5 * 60;
const OTP_RESEND_SEC = 60;
const OTP_MAX_ATTEMPTS = 5;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const pepper = () => {
  const p = process.env.OTP_PEPPER;
  if (!p && process.env.NODE_ENV === "production" && process.env.SMS_PROVIDER === "eskiz") throw new Error("OTP_PEPPER is required");
  return p ?? "dev-pepper";
};
const otpHash = (phone: string, code: string) => sha256(`${pepper()}:${phone}:${code}`);

export type SessionUser = { id: string; phone: string; name: string | null; role: "client" | "vendor" | "admin" };

/* ── OTP ── */
export async function requestOtp(phone: string, ip: string) {
  await limit(`otp:ip:${ip}`, 20, 3600);
  await limit(`otp:phone:${phone}`, 5, 3600, "Bu raqamga juda koʻp kod yuborildi. 1 soatdan keyin urinib koʻring.");

  const [last] = await db
    .select({ createdAt: schema.otpCodes.createdAt })
    .from(schema.otpCodes)
    .where(eq(schema.otpCodes.phone, phone))
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (last) {
    const wait = OTP_RESEND_SEC - Math.floor((Date.now() - last.createdAt.getTime()) / 1000);
    if (wait > 0) throw new HttpError(429, "otp_cooldown", `Yangi kodni ${wait} soniyadan keyin soʻrang`, { retryAfter: wait });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(schema.otpCodes).values({
    phone,
    codeHash: otpHash(phone, code),
    expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000),
    ip,
  });
  await sendSms(phone, `Datelle: tasdiqlash kodi ${code}. Kodni hech kimga bermang.`);
  return { resendIn: OTP_RESEND_SEC, ...(echoCode() ? { devCode: code } : {}) };
}

export async function verifyOtp(phone: string, code: string) {
  const [otp] = await db
    .select()
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), isNull(schema.otpCodes.consumedAt), gt(schema.otpCodes.expiresAt, new Date())))
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (!otp) throw new HttpError(400, "otp_expired", "Kod eskirgan. Yangisini soʻrang.");
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, "otp_locked", "Urinishlar tugadi. Yangi kod soʻrang.");

  const ok = timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(otpHash(phone, code)));
  if (!ok) {
    await db.update(schema.otpCodes).set({ attempts: sql`${schema.otpCodes.attempts} + 1` }).where(eq(schema.otpCodes.id, otp.id));
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    throw new HttpError(400, "otp_wrong", left > 0 ? `Kod notoʻgʻri. Yana ${left} ta urinish qoldi.` : "Urinishlar tugadi. Yangi kod soʻrang.");
  }
  await db.update(schema.otpCodes).set({ consumedAt: new Date() }).where(eq(schema.otpCodes.id, otp.id));
}

/* ── users & sessions ── */
export async function upsertUser(phone: string, name?: string) {
  const [u] = await db
    .insert(schema.users)
    .values({ phone, name: name || null })
    .onConflictDoUpdate({
      target: schema.users.phone,
      set: { name: sql`coalesce(${schema.users.name}, excluded.name)` },
    })
    .returning();
  return u;
}

export async function startSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: schema.users.id, phone: schema.users.phone, name: schema.users.name, role: schema.users.role, expiresAt: schema.sessions.expiresAt, sid: schema.sessions.id })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  // sliding expiry: extend once less than half the lifetime is left
  if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * 86_400_000) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.id, row.sid));
    try {
      (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
    } catch {
      /* server components cannot set cookies — the next API call will */
    }
  }
  return { id: row.id, phone: row.phone, name: row.name, role: row.role };
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "unauthorized", "Davom etish uchun telefon raqamingizni tasdiqlang");
  return u;
}
