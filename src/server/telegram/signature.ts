/* Telegram signature checks. Pure (node:crypto only) — unit-tested, no env access.
   - Webhook:      X-Telegram-Bot-Api-Secret-Token header == TELEGRAM_WEBHOOK_SECRET
   - Mini App:     secret = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN)
   - Login Widget: secret = SHA256(BOT_TOKEN)
   Both auth checks: hash == hex(HMAC_SHA256(secret, data_check_string)), auth_date ≤ 24 h old.
   Docs: core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app,
         core.telegram.org/widgets/login#checking-authorization */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const MAX_AUTH_AGE_S = 24 * 3600;
/* Clock skew we tolerate for auth_date slightly in the future */
const FUTURE_SKEW_S = 60;

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type VerifyFail = "missing" | "malformed" | "bad_hash" | "expired";
export type Verified<T> = { ok: true; data: T } | { ok: false; reason: VerifyFail };

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* Fields sorted by key, "key=value" joined by "\n", hash excluded */
export function dataCheckString(fields: Iterable<[string, string]>) {
  return [...fields]
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

function checkAge(authDate: number, nowS: number): VerifyFail | null {
  if (!Number.isInteger(authDate) || authDate <= 0) return "malformed";
  if (authDate > nowS + FUTURE_SKEW_S) return "malformed";
  if (nowS - authDate > MAX_AUTH_AGE_S) return "expired";
  return null;
}

/* Constant-time shared-secret check (webhook header, cron bearer) */
export function verifySecret(given: string | null, secret: string | undefined | null) {
  if (!secret || !given) return false;
  return safeEqual(given, secret);
}
export const verifyWebhookSecret = verifySecret;

export type InitData = {
  user: TelegramUser;
  authDate: number;
  startParam?: string;
  queryId?: string;
};

/* Mini App: Telegram.WebApp.initData (URL-encoded query string) */
export function verifyInitData(initData: string, botToken: string, nowS = Math.floor(Date.now() / 1000)): Verified<InitData> {
  if (!initData || !botToken) return { ok: false, reason: "missing" };
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing" };

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString(params.entries())).digest("hex");
  if (!safeEqual(hash, expected)) return { ok: false, reason: "bad_hash" };

  const authDate = Number(params.get("auth_date"));
  const age = checkAge(authDate, nowS);
  if (age) return { ok: false, reason: age };

  let user: TelegramUser;
  try {
    user = JSON.parse(params.get("user") ?? "");
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!user || !Number.isSafeInteger(user.id) || typeof user.first_name !== "string") return { ok: false, reason: "malformed" };

  return {
    ok: true,
    data: {
      user,
      authDate,
      startParam: params.get("start_param") ?? undefined,
      queryId: params.get("query_id") ?? undefined,
    },
  };
}

/* Desktop: payload from the Telegram Login Widget callback (values arrive as strings or numbers) */
export function verifyLoginWidget(
  payload: Record<string, unknown>,
  botToken: string,
  nowS = Math.floor(Date.now() / 1000),
): Verified<{ user: TelegramUser; authDate: number }> {
  if (!payload || !botToken) return { ok: false, reason: "missing" };
  const hash = payload.hash;
  if (typeof hash !== "string" || !hash) return { ok: false, reason: "missing" };

  const fields: [string, string][] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v !== "string" && typeof v !== "number") return { ok: false, reason: "malformed" };
    fields.push([k, String(v)]);
  }
  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString(fields)).digest("hex");
  if (!safeEqual(hash, expected)) return { ok: false, reason: "bad_hash" };

  const authDate = Number(payload.auth_date);
  const age = checkAge(authDate, nowS);
  if (age) return { ok: false, reason: age };

  const id = Number(payload.id);
  if (!Number.isSafeInteger(id) || typeof payload.first_name !== "string") return { ok: false, reason: "malformed" };

  const opt = (k: string) => (typeof payload[k] === "string" ? (payload[k] as string) : undefined);
  return {
    ok: true,
    data: {
      user: { id, first_name: payload.first_name, last_name: opt("last_name"), username: opt("username"), photo_url: opt("photo_url") },
      authDate,
    },
  };
}
