/* Bot configuration from env. Every value is optional so the site builds and runs without a bot;
   routes check `botConfig()` and fail closed (503) when something is missing.

   TELEGRAM_BOT_TOKEN        — from @BotFather
   TELEGRAM_WEBHOOK_SECRET   — optional, 32–256 chars [A-Za-z0-9_-]; Telegram echoes it in a header
   CRON_SECRET               — Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"
   TELEGRAM_MINIAPP_URL      — optional, defaults to <site>/panel
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME — public, for t.me links and the Login Widget */
import { createHmac } from "node:crypto";
import { SITE_URL } from "@/config/site";

export const WEBHOOK_PATH = "/api/telegram/webhook";
const SECRET_RE = /^[A-Za-z0-9_-]{32,256}$/;

export const panelUrl = () => process.env.TELEGRAM_MINIAPP_URL || `${SITE_URL}/panel`;

/* Webhook secret: explicit env wins; otherwise derived from the token (HMAC, 64 hex chars),
   so the minimum setup is one secret. Rotating the token rotates this too — setup re-registers it. */
const TOKEN_RE = /^\d+:[\w-]{30,}$/;
export const botToken = () => {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t && TOKEN_RE.test(t) ? t : null;
};

export function botConfig() {
  const token = botToken();
  if (!token) return null;
  const explicit = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (explicit && !SECRET_RE.test(explicit)) return null;
  const webhookSecret = explicit || createHmac("sha256", token).update("datelle-webhook-v1").digest("hex");
  return { token, webhookSecret };
}

export const cronSecret = () => {
  const s = process.env.CRON_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
};
