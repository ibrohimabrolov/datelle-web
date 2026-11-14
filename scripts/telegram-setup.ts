/* Configures the Telegram bot so nobody has to call the Bot API by hand.
   Runs in `vercel-build` after migrations; only on the production deployment
   (previews sit behind Vercel auth, Telegram can't reach them). Idempotent.
   Never fails the build — a bot hiccup must not block a site release.

   Manual run:  npx tsx --env-file=.env.local scripts/telegram-setup.ts --force */
import { callTelegram } from "../src/server/telegram/api";
import { botConfig, panelUrl, WEBHOOK_PATH } from "../src/server/telegram/config";
import { BOT_COMMANDS, BOT_DESCRIPTION, BOT_SHORT_DESCRIPTION, COPY } from "../src/server/telegram/messages";
import { SITE_URL } from "../src/config/site";

async function main() {
  const force = process.argv.includes("--force");
  if (process.env.VERCEL_ENV !== "production" && !force) {
    console.log("[telegram] production emas — bot sozlash oʻtkazib yuborildi");
    return;
  }
  const cfg = botConfig();
  if (!cfg) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET yoʻq yoki notoʻgʻri — bot sozlanmadi");
    return;
  }
  const app = panelUrl();
  if (!SITE_URL.startsWith("https://") || !app.startsWith("https://")) {
    console.warn(`[telegram] https manzil kerak (${SITE_URL}) — bot sozlanmadi`);
    return;
  }

  const t = <T>(method: string, payload: object) => callTelegram<T>(cfg.token, method, payload);
  const me = await t<{ username: string }>("getMe", {});

  await t("setWebhook", {
    url: `${SITE_URL}${WEBHOOK_PATH}`,
    secret_token: cfg.webhookSecret,
    allowed_updates: ["message"],
    max_connections: 10,
  });
  await t("setMyCommands", { commands: BOT_COMMANDS });
  await t("setMyDescription", { description: BOT_DESCRIPTION });
  await t("setMyShortDescription", { short_description: BOT_SHORT_DESCRIPTION });
  await t("setChatMenuButton", { menu_button: { type: "web_app", text: COPY.open, web_app: { url: app } } });

  console.log(`[telegram] @${me.username} → ${SITE_URL}${WEBHOOK_PATH} · Mini App ${app}`);
}

main().catch((e) => {
  console.warn("[telegram] sozlashda xato (build davom etadi):", e instanceof Error ? e.message : e);
});
