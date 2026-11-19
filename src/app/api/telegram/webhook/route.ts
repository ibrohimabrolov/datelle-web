/* Telegram → us. Set by scripts/telegram-setup.ts (setWebhook with secret_token).
   The reply goes back in the webhook response body (Bot API "answer the webhook" feature):
   one round-trip, no outbound call, nothing to retry. */
import { NextResponse, type NextRequest } from "next/server";
import { HttpError, json, route } from "@/server/http";
import { handleLoginUpdate } from "@/server/panel/botLogin";
import { handleDraftUpdate } from "@/server/panel/drafts";
import { botConfig, panelUrl } from "@/server/telegram/config";
import { replyTo, type TgUpdate } from "@/server/telegram/messages";
import { verifyWebhookSecret } from "@/server/telegram/signature";

const MAX_BODY = 64 * 1024;

export const POST = route(async (req: NextRequest) => {
  const cfg = botConfig();
  if (!cfg) throw new HttpError(503, "bot_disabled", "Bot sozlanmagan");
  if (!verifyWebhookSecret(req.headers.get("x-telegram-bot-api-secret-token"), cfg.webhookSecret)) {
    throw new HttpError(401, "bad_secret", "Ruxsat yoʻq");
  }

  // From here on always 200: a non-2xx makes Telegram redeliver the same update for hours
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ ok: true, skipped: "too_large" });
  let update: TgUpdate;
  try {
    update = JSON.parse(raw);
  } catch {
    return json({ ok: true, skipped: "bad_json" });
  }

  const login = await handleLoginUpdate(update, cfg.token).catch((e) => {
    console.error("[telegram] login update failed", e);
    return null;
  });
  if (login) return NextResponse.json(login, { headers: { "Cache-Control": "no-store" } });

  // Forward → buyurtma: the draft flow answers by itself (one card it keeps editing)
  const drafted = await handleDraftUpdate(update, cfg.token, panelUrl()).catch((e) => {
    console.error("[telegram] draft update failed", e);
    return false;
  });
  if (drafted) return json({ ok: true });

  const reply = replyTo(update, panelUrl());
  if (!reply) return json({ ok: true });
  return NextResponse.json({ method: "sendMessage", ...reply }, { headers: { "Cache-Control": "no-store" } });
});
