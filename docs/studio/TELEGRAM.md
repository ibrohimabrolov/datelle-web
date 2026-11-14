# Datelle Studio — Telegram bot

Status: **foundation done** (branch `studio/telegram`). Inert until env is set: webhook and cron answer 503, build-time setup is skipped.

## What is in place

| Piece | File | Notes |
|---|---|---|
| Signatures | `src/server/telegram/signature.ts` | Mini App `initData` (`HMAC("WebAppData", token)`), Login Widget (`SHA256(token)`), `auth_date` ≤ 24 h, constant-time shared-secret compare. Used by Phase 1 auth. |
| Copy + builders | `src/server/telegram/messages.ts` | `/start`, `/start inv_<token>`, `/help`, groups ignored; daily digest text. Pure, unit-tested. |
| Bot API client | `src/server/telegram/api.ts` | `callTelegram`, typed `TelegramError` (`permanent` = user blocked the bot), one 429 retry. |
| Webhook | `POST /api/telegram/webhook` | Checks `X-Telegram-Bot-Api-Secret-Token`; replies in the webhook response body (no outbound call). Always 200 after auth so Telegram never redelivers. |
| Daily cron | `GET /api/cron/daily` | `vercel.json` → `0 15 * * *` (20:00 Tashkent). `Authorization: Bearer CRON_SECRET`. Sends tomorrow's digest per studio, nothing on empty days, ~25 msg/s. |
| Data source | `src/server/telegram/digests.ts` | Returns `[]` until Phase 1 tables exist — the only stub. |
| Setup | `scripts/telegram-setup.ts` | Runs in `vercel-build` on production only: `setWebhook` (secret, `message` updates), commands, description, menu button → Mini App. Never fails the build. Manual: `npm run bot:setup`. |
| Tests | `tests/telegram.test.ts` | 16 cases: valid / tampered / expired for both signatures, routing, escaping, money/date format, digest caps, fan-out dedupe + blocked users, config. |

## Env (Vercel → Production)

| Name | Required | Value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | yes | From @BotFather |
| `CRON_SECRET` | yes | 32+ random characters |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | yes | Bot username without `@` |
| `TELEGRAM_WEBHOOK_SECRET` | no | Empty = derived from the token |
| `TELEGRAM_MINIAPP_URL` | no | Default `<site>/panel` |

## Decisions

- **Reply in the webhook body.** One round-trip, no token needed on the hot path, nothing to retry.
- **Derived webhook secret.** One fewer secret for a non-technical owner to manage; rotating the token rotates it and the next deploy re-registers the webhook.
- **Setup at build, not by hand.** No one calls the Bot API manually; every production deploy re-asserts the webhook, so a stale URL fixes itself.
- **Copy says "kechqurun", not "20:00".** Vercel Hobby cron fires somewhere inside the scheduled hour.
- **Blocked users are reported, not retried.** Phase 1 flags the member (`reminders_off`) from `blocked[]`.

## Next (needs Phase 1)

1. `loadDigests(date)` — real query (Tech §6), per-member mute toggle from Sozlamalar → Eslatmalar.
2. `POST /api/panel/auth/telegram` and `/auth/widget` on top of `verifyInitData` / `verifyLoginWidget`.
3. Invite accept: `?taklif=<token>` (from `/start inv_…`) and `start_param` (from `t.me/<bot>?startapp=inv_…`).
4. BotFather `/setdomain` once the production domain is final (Login Widget).
