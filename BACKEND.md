# Datelle — backend (v1)

Monolith: Next.js 16 route handlers + Postgres 16 + Drizzle ORM. One repo, one deploy.
Status: **Phase 1 done** — real availability, phone login (SMS OTP), booking/quote requests, "Bronlarim", partner applications, concierge leads.

## Run locally

```bash
# Postgres 16 running locally, then:
cp .env.example .env.local        # set DATABASE_URL
npm install
npm run db:migrate                # apply drizzle/*.sql
npm run db:seed                   # 62 vendors, packages, ~8 months of availability (idempotent)
npm run dev
```

Tests:

```bash
npm test                          # unit: dates, working hours, phone parsing
npm run build && npm start &      # API tests hit a running server
npm run test:api                  # 25 integration tests (auth, requests, admin, security edges)
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `DB_POOL_MAX` | pool size per instance (default 5) |
| `SMS_PROVIDER` | `console` (dev — code in server log), `demo` (preview — code shown on the page), `eskiz` (production) |
| `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` / `ESKIZ_FROM` | Eskiz.uz credentials |
| `OTP_PEPPER` | long random secret mixed into OTP hashes — **required in production** |
| `ADMIN_PASSWORD` | password for `/admin`; empty = admin disabled (API answers 404). Changing it logs every admin out |

`demo` must never be used once real users arrive: it echoes the login code to the browser.

## Deploy (Vercel + Neon)

`package.json → vercel-build` runs `scripts/predeploy.ts` before `next build`: applies `drizzle/*.sql` (using `DATABASE_URL_UNPOOLED` when Neon provides it) and seeds **only when the `vendors` table is empty**, so admin edits survive redeploys. Without `DATABASE_URL` it skips and the site still builds. Locally: `npm run db:deploy`.

## Admin panel (`/admin`)

Password login (`ADMIN_PASSWORD`), stateless HMAC cookie `dt_admin` (httpOnly, 7 days), 5 attempts per IP per 15 min. Sections:

- **Umumiy** — counters + requests waiting for an answer
- **Soʻrovlar** — filter/search; `pending → confirmed | declined`, `confirmed → paid | declined | cancelled`, `paid → completed | cancelled`. Confirming takes one of the vendor's daily slots (`vendor_days.booked + 1`); leaving confirmed/paid (or a client cancelling a confirmed request) gives it back. Every move is written to `request_events` with `actor = admin`
- **Studiyalar** — hide/show, daily capacity, "verified" badge, close/reopen days for the next 8 weeks
- **Hamkor arizalari** — new → reviewing → approved / rejected
- **Lidlar** — mark as contacted

Shared password is a v1 shortcut. Before real users: per-person admin accounts (`users.role = admin` + OTP) and an audit of who did what.

## Data model (`src/server/db/schema.ts`)

- `users` — phone (+998…), name, role
- `sessions` — sha256(token) only; raw token lives in an httpOnly cookie `dt_session`, 30 days, sliding
- `otp_codes` — hashed 6-digit codes, 5 min TTL, 5 attempts, 60 s resend cooldown
- `vendors`, `packages` — seeded from `src/data/catalog.ts`; `daily_capacity` (default 3 events/day)
- `vendor_days` — per-day `booked` / `blocked`; missing row = empty day. Status: busy if blocked or booked ≥ capacity, "1 joy" if one slot left
- `requests` — booking (package, price + 30 % deposit snapshot) or quote (brief); status machine below; one open request per client/vendor/date (partial unique index)
- `request_events` — audit log of every status change
- `partner_applications`, `leads`
- `rate_limits` — fixed-window counters in Postgres (works across serverless instances)

Request lifecycle: `pending → confirmed → paid → completed`, side exits `declined`, `expired` (vendor missed the deadline), `cancelled` (client). Deadline: booking — 6 working hours (22:00–08:00 Toshkent not counted), quote — 24 h. Expiry is applied lazily on read; a cron can run the same update later.

## API

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | DB ping |
| GET | `/api/vendors/search?sana&tur&tadbir&tuman&byudjet&f&saralash&limit&offset` | — | free vendors for a date, cacheable 30 s |
| GET | `/api/availability?from&days&…filters` | — | free-vendor count per day (≤ 62 days) |
| GET | `/api/vendors/:slug/calendar?month=YYYY-MM` | — | free / few / busy per day |
| POST | `/api/auth/otp` `{phone}` | — | sends code; per-phone 5/h, per-IP 20/h, 60 s cooldown |
| POST | `/api/auth/verify` `{phone, code, name?}` | — | sets session cookie |
| POST | `/api/auth/logout` | cookie | |
| GET | `/api/me` | cookie | `{user \| null}` |
| GET/POST | `/api/requests` | cookie | list mine / create (10 per user per day) |
| GET | `/api/requests/:id` | owner | 404 for anyone else |
| POST | `/api/requests/:id/cancel` | owner | pending/confirmed only |
| POST | `/api/partners` | — | 5/h per IP |
| POST | `/api/leads` | — | 10/h per IP |
| POST | `/api/admin/login` `{password}` · `/api/admin/logout` | — | 5 tries / 15 min per IP |
| GET | `/api/admin/{me,stats,requests,vendors,applications,leads}` | admin | |
| POST | `/api/admin/requests/:id` `{to}` · `/api/admin/vendors/:id` · `/api/admin/vendors/:id/days` · `/api/admin/applications/:id` · `/api/admin/leads/:id` | admin | |

Errors: `{ error: { code, message, fields? } }` — messages are user-facing Uzbek. Mutations require `content-type: application/json` and a same-site `Origin` (CSRF).

## Decisions still open (before real users)

1. **Production database location.** Uzbekistan's personal-data law requires citizens' personal data to be stored on servers in Uzbekistan. Vercel and most managed Postgres run abroad. Plan: Postgres (and ideally the app) on an Uzbek provider; a foreign DB (e.g. Neon) is acceptable only for a demo with test data.
2. **SMS contract** with Eskiz (or Play Mobile): sender name and approved message template. Eskiz endpoints in `src/server/sms.ts` must be checked against their current docs when the contract is signed.
3. **Payments** — Payme / Click merchant accounts; deposit flow (`confirmed → paid`) is not built yet.
4. **Vendor side** — confirm / decline / block days by the studio itself. Planned as a Telegram bot + vendor panel; until then the admin panel does it.
5. **Photo uploads** for quotes and vendor galleries — needs object storage (S3-compatible, in Uzbekistan).


## Datelle Studio (`/panel`, `/api/panel/*`)

Internal tool for studios — separate tables (`studios`, `studio_members`, `studio_invites`, `studio_days`, `orders`, `order_payments`, `studio_events`), separate session (`dt_panel`, `sessions.scope = 'panel'`). Plan and status: `docs/studio/IMPLEMENTATION-PLAN.md`, bot: `docs/studio/TELEGRAM.md`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/panel/auth/config` | — | `{ botId, botUsername, devLogin }` for the Kirish screen |
| POST | `/api/panel/auth/telegram` `{initData}` | — | Mini App; HMAC("WebAppData", token), ≤ 24 h; 60/h/IP |
| POST | `/api/panel/auth/widget` | — | desktop Login Widget payload; SHA256(token) |
| POST | `/api/panel/auth/dev` `{id, firstName?}` | — | only with `PANEL_DEV_LOGIN=1` and never on Vercel |
| POST | `/api/panel/auth/logout` | cookie | deletes the session row |
| GET | `/api/panel/me` | cookie | user + studios with role |
| POST | `/api/panel/onboarding` `{name, category, dailyCapacity}` | cookie | creates studio + owner; 409 if the user already owns one |
| GET | `/api/panel/studio` | member | `x-studio-id` optional; not a member → 404 |
| GET | `/api/panel/calendar?month=YYYY-MM` | member | days with data: status, load, reason/note, orders with balance; summary |
| PUT | `/api/panel/days/:date` `{blocked, reason?, note?}` | member | close needs a reason (tamir/dam/shaxsiy/boshqa), today…+730; `warnings: ["has_orders"]` |
| POST | `/api/telegram/webhook` | secret header | bot updates |
| GET | `/api/cron/daily` | `Bearer CRON_SECRET` | 20:00 Tashkent reminders |

Tests: `npm run test:panel` against a running server started with `PANEL_DEV_LOGIN=1 TELEGRAM_BOT_TOKEN=7000000001:AAtest_token_for_local_integration_only CRON_SECRET=cron_test_secret_1234567890`.
