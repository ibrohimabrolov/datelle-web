/* Bot ↔ site wiring in one place: the build script, the daily cron and the status route all use it.
   Idempotent — re-registering the same webhook is a no-op on Telegram's side. */
import { SITE_URL } from "@/config/site";
import { callTelegram } from "./api";
import { botConfig, panelUrl, WEBHOOK_PATH } from "./config";
import { BOT_COMMANDS, BOT_DESCRIPTION, BOT_SHORT_DESCRIPTION, COPY } from "./messages";

type Cfg = NonNullable<ReturnType<typeof botConfig>>;
type WebhookInfo = { url: string; pending_update_count: number; last_error_date?: number; last_error_message?: string };

export const webhookUrl = () => `${SITE_URL}${WEBHOOK_PATH}`;

/* Full setup: webhook + commands + texts + menu button. Returns the bot's username. */
export async function setupBot(cfg: Cfg) {
  const t = <T>(method: string, payload: object) => callTelegram<T>(cfg.token, method, payload);
  const me = await t<{ username: string }>("getMe", {});
  await t("setWebhook", {
    url: webhookUrl(),
    secret_token: cfg.webhookSecret,
    allowed_updates: ["message", "callback_query"],
    max_connections: 10,
  });
  await t("setMyCommands", { commands: BOT_COMMANDS });
  await t("setMyDescription", { description: BOT_DESCRIPTION });
  await t("setMyShortDescription", { short_description: BOT_SHORT_DESCRIPTION });
  await t("setChatMenuButton", { menu_button: { type: "web_app", text: COPY.open, web_app: { url: panelUrl() } } });
  return me.username;
}

/* Read-only health of the bot, plus self-repair: if Telegram's webhook points anywhere but this site
   (new token, domain change, a build that skipped setup), run the setup once. Never exposes the token. */
export async function botStatus(cfg: Cfg, { repair = true } = {}) {
  const me = await callTelegram<{ username: string }>(cfg.token, "getMe", {});
  let info = await callTelegram<WebhookInfo>(cfg.token, "getWebhookInfo", {});
  const expected = webhookUrl();
  let repaired = false;
  if (repair && expected.startsWith("https://") && info.url !== expected) {
    await setupBot(cfg);
    info = await callTelegram<WebhookInfo>(cfg.token, "getWebhookInfo", {});
    repaired = true;
  }
  return {
    bot: `@${me.username}`,
    webhook: {
      ok: info.url === expected,
      url: info.url || null,
      expected,
      pending: info.pending_update_count,
      lastError: info.last_error_message ?? null,
      lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
    },
    repaired,
  };
}
