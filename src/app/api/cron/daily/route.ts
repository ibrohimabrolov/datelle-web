/* Vercel Cron, 15:00 UTC = 20:00 Tashkent (vercel.json). Vercel sends
   "Authorization: Bearer <CRON_SECRET>". Sends tomorrow's digest to every studio member;
   empty days get no message. Safe to call by hand with the same header. */
import type { NextRequest } from "next/server";
import { addDays, todayISO } from "@/lib/dates";
import { HttpError, json, route } from "@/server/http";
import { callTelegram, TelegramError } from "@/server/telegram/api";
import { botConfig, cronSecret, panelUrl } from "@/server/telegram/config";
import { loadDigests } from "@/server/telegram/digests";
import { fanOutReminders } from "@/server/telegram/reminders";
import { verifySecret } from "@/server/telegram/signature";

export const maxDuration = 60;

export const GET = route(async (req: NextRequest) => {
  // Request access comes first: with cacheComponents it also keeps this GET out of build-time prerendering
  const auth = req.headers.get("authorization") ?? "";
  const secret = cronSecret();
  if (!secret) throw new HttpError(503, "cron_disabled", "Cron sozlanmagan");
  if (!verifySecret(auth.replace(/^Bearer\s+/i, ""), secret)) throw new HttpError(401, "bad_secret", "Ruxsat yoʻq");

  const bot = botConfig();
  if (!bot) throw new HttpError(503, "bot_disabled", "Bot sozlanmagan");

  const started = Date.now();
  const date = addDays(todayISO(), 1);
  const studios = await loadDigests(date);
  const result = await fanOutReminders(
    studios,
    panelUrl(),
    (msg) => callTelegram(bot.token, "sendMessage", msg),
    (e) => e instanceof TelegramError && e.permanent,
  );

  console.info("[cron:daily]", date, JSON.stringify(result));
  return json({ ok: true, date, ...result, ms: Date.now() - started });
});
