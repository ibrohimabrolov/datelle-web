/* GET /api/telegram/status — is the bot wired to this site? Public and read-only (no secrets in the
   answer); if the webhook points elsewhere it re-runs the setup once (idempotent). Used after a token
   or domain change instead of digging through build logs. */
import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { botConfig } from "@/server/telegram/config";
import { botStatus } from "@/server/telegram/setup";

export const GET = route(async (req: NextRequest) => {
  void req.headers; // request-bound: keeps this GET out of build-time prerendering (cacheComponents)
  const cfg = botConfig();
  if (!cfg) {
    return json({ ok: false, configured: false, hint: "TELEGRAM_BOT_TOKEN yoʻq yoki formati notoʻgʻri" }, { status: 503 });
  }
  try {
    const s = await botStatus(cfg);
    return json({ ok: s.webhook.ok, configured: true, ...s });
  } catch (e) {
    const msg = e instanceof Error ? e.message.replace(/bot\d+:[\w-]+/g, "bot***") : String(e);
    return json({ ok: false, configured: true, error: msg }, { status: 502 });
  }
});
