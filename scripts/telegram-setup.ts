/* Configures the Telegram bot so nobody has to call the Bot API by hand.
   Runs in `vercel-build` after migrations; only on the production deployment
   (previews sit behind Vercel auth, Telegram can't reach them). Idempotent.
   Never fails the build — a bot hiccup must not block a site release.

   Manual run:  npx tsx --env-file=.env.local scripts/telegram-setup.ts --force */
import { botConfig, panelUrl } from "../src/server/telegram/config";
import { setupBot, webhookUrl } from "../src/server/telegram/setup";
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

  const username = await setupBot(cfg);
  console.log(`[telegram] @${username} → ${webhookUrl()} · Mini App ${app}`);
}

main().catch((e) => {
  console.warn("[telegram] sozlashda xato (build davom etadi):", e instanceof Error ? e.message : e);
});
