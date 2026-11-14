# Datelle Studio — implementation plan

> v1.0 · 2026-11-12 · Status: **prep done, feature code not started** (waiting for Ibrohim's Figma review).
> Decision 2026-11-12: code is built regardless of the demo go/no-go — the product doubles as a portfolio case. Demos still run in parallel and still shape v1.1.

## Ground rules

- `main` = production (`datelle-web.vercel.app`). Every phase on its own branch `studio/<phase>`, merged only after checks pass.
- Marketplace code (`(site)`, `/admin`, existing `/api/*`, `app/globals.css`) is not touched. Studio lives in `src/app/panel`, `src/app/api/panel`, `src/components/studio`, `src/server/studio`, `src/studio`.
- Read `node_modules/next/dist/docs/` before writing Next code (Next 16, see `AGENTS.md`).
- Design is the spec: `docs/studio/DESIGN-HANDOFF.md` + Figma. Every PR ends with a 1:1 visual check against the Figma screen at 390 and 1440 (and 1280/1920 for desktop).
- Tests stay green: existing unit/API/e2e + new studio tests per phase.

## Phase 0 — Prep ✅ (this branch `studio/prep`)

- [x] Tokens exported from Figma → `src/studio/tokens.json` + `src/studio/tokens.css` (scoped `.studio`, Light/Dark, Telegram themeParams mapping, focus ring, motion).
- [x] Design handoff map: components → React, screens → routes, state matrix, a11y checklist.
- [x] This plan.
- [ ] Ibrohim reviews Figma (prototype flows) → comments become issues before Phase 1.

## Phase 1 — Schema, auth, shell (`studio/foundation`)

- Migration `drizzle/0001_studio.sql`: `studios`, `studio_members`, `studio_invites`, `studio_days`, `orders`, `order_payments`, `studio_events`; `users` + `telegram_id`, nullable `phone` (Tech §2).
- Auth: Mini App `initData` + desktop Login Widget → session cookie `dt_panel`; `requireStudio()` (Tech §3–4).
- `/panel` layout: `.studio` wrapper + `tokens.css`, Sidebar (≥1024) / TabBar (<1024), Telegram SDK init (`ready`, `expand`, BackButton, MainButton, theme → `data-platform`, `data-theme`).
- Base components: Button, IconButton, TextField, SearchField, Switch, Checkbox, Chip, SegmentedControl, StatusPill, Alert, Toast, ConfirmDialog, PanelHeader, BottomSheet.
- **Done when:** unit tests for both signatures (valid / tampered / expired); tenant isolation test skeleton; Storybook-free component page `/panel/_ui` (dev only) matches Figma components 1:1.

**Status 2026-11-14 (`studio/foundation`):**
- [x] Migration `0001_studio.sql` — 7 tables + `users.telegram_id`, nullable `phone`, `sessions.scope` (site/panel: a panel token never works on the marketplace). DB-level guards: one owner per studio, capacity 1–20, total ≥ 0, payment > 0.
- [x] Auth: `/api/panel/auth/{telegram,widget,logout,config,dev}`, cookie `dt_panel` (prod: `SameSite=None; Partitioned` for Telegram Web iframes), `requireStudio()` (non-member → 404, wrong role → 403), `/api/panel/me`, `/api/panel/onboarding` (advisory lock — double tap can't create two studios; 90-day founding trial), `/api/panel/studio`.
- [x] `/panel` shell: provider (Mini App signs in from initData on every open), Sidebar ≥1024 / floating TabBar <1024, icons exported 1:1 from Figma, Telegram theme + MainButton, Kirish (S1 desktop) and Onboarding (S1) screens, Sozlamalar (read-only), placeholders for Phase 3–5 pages.
- [x] Tests: 13 panel API tests (auth, tampering, CSRF, scope, logout replay, validation, tenancy 404, manager role, one-owner constraint, cron digest), axe WCAG 2.2 AA clean on all screens at 390 and 1440.
- [ ] Remaining base components move into the phases that first use them (Chip/Segment → Calendar, DataTable/Toast/ConfirmDialog → Orders).

## Phase 2 — Onboarding, settings, team (`studio/team`)

Onboarding (Mini App), Sozlamalar (owner / manager views), invites (`t.me/<bot>?startapp=inv_…`, 7 days, one-time), remove member (confirm). **Done when:** API tests for invite reuse/expiry and role guards.

## Phase 3 — Calendar (`studio/calendar`)

Month grid (DayCell / DayCellLarge, states incl. "1 joy"), day sheet (mobile) / side panel (desktop), close/open day with reason + undo toast, capacity warning (not blocking). **Done when:** `day_status` unit tests (capacity 1 and 3); keyboard navigation across the grid.

**Status 2026-11-14 (`studio/calendar`):**
- [x] `src/lib/studio/calendar.ts` — `dayStatus` (free / has / limited / booked / blocked), `monthWeeks`, reasons, event tones; 5 unit tests (capacity 1 and 3, blocked wins, Monday-first weeks, block window).
- [x] `GET /api/panel/calendar?month=` (days with data only, balance from live payments, summary "N tadbir · M ta qoldiq"), `PUT /api/panel/days/:date` (reason required to close, today…+730 days, row deleted on reopen, audit only on real change, `has_orders` warning). Migration `0002_day_reason.sql`.
- [x] UI per Figma: DayCell (mobile) / DayCell Large (desktop) from one element, side panel 480 / bottom sheet, Kunni yopish (reason chips + note), Kun · yopiq → Kunni ochish, toast with undo, legend per breakpoint, "Bugun" list on mobile, FAB, month cache + neighbour prefetch, deep links `?oy=&sana=` (bot reminder opens the day).
- [x] Keyboard: arrows / Home / End / PageUp / PageDown across months, Enter opens, Esc closes and returns focus to the day; Telegram BackButton closes the sheet.
- [x] Tests: 5 calendar API tests (status, tenancy 404, reason validation, past-day guard, audit no-op), axe 0 violations (grid, panel, sheet, close form), flows green on dev and production build.
- Copy fix vs Figma: "Mijozlar bu sanani band deb koʻradi" → "Bu kunga yangi buyurtma qoʻshilsa, ogohlantirish chiqadi…" (Studio has no client side).

## Phase 4 — Orders & payments (`studio/orders`)

List (segments, search, cursor pagination, bulk select), DataTable (desktop) / OrderCard (mobile), create/edit form (validation, saving, unsaved guard), detail panel, payments (add, undo, owner soft delete), cancel/done with confirm, history (audit). **Done when:** balance/overpayment unit tests; soft delete restores balance; audit written for every money/status change.

**Status 2026-11-14 (`studio/orders`):**
- [x] API: list (`view` upcoming/debt/past/cancelled, search name/venue/code + phone digits, sort date/total/balance, page 30, counts), create (+advance as first payment, `capacity_exceeded` / `day_blocked` warnings, DS-###### codes), detail, edit (field diff audit, no-op writes nothing), status machine (active→done|cancelled, done→active, cancelled→active), payments (future date refused, cancelled order refused, `overpaid` warning), soft delete (owner always; manager only own payment ≤10 min = toast undo), history, `/api/panel/summary` (nav badge).
- [x] UI per Figma S4/S5: DataTable with sortable headers + pagination (desktop), week-grouped cards + "Yana N ta" (mobile), segments with counts, debounced search, empty states (Topilmadi / Qoldiq yoʻq / …), OrderForm (Mijoz · Tadbir · Pul, live Qoldiq, day capacity, unsaved guard), detail (balance card + progress, call / Telegram, payments, ⋯ Tahrirlash · Bajarildi · Bekor qilish · Tarix), payment modal ("Toʻliq qoldiq", method, date), ConfirmDialog, toasts with undo, NavItem debt badge.
- [x] Calendar opens the form and order detail in place — the demo flow (day → order + advance → day turns "1 joy") works end to end.
- [x] Tests: 3 unit (transitions, money parsing, week groups), 10 API (create/advance, validation, capacity warning, payments + undo rights, edit diff, status machine, list/search, history, tenancy 404 everywhere); axe 0 on form, detail, payment modal, list at 390 and 1440.
- Deviations: offset pagination instead of cursor (studios have hundreds of orders, not millions; gives "1–30 · jami N" like Figma); bulk select dropped until there is a bulk action; native date input instead of the custom date sheet.

## Phase 5 — Dashboard (`studio/dashboard`)

KPI (month paid + delta, total balance, next 30 days), next 7 days, balance list with overdue alert, revenue chart (12 months). Owner only. **Done when:** numbers reconcile with orders/payments fixtures.

## Phase 6 — Bot & reminders (`studio/bot`)

Webhook `/start`, daily 20:00 Tashkent (15:00 UTC) cron with tomorrow's events + balance to collect; settings toggles respected. **Done when:** cron dry-run test; no message for empty days.

- [x] Foundation pulled forward (`studio/telegram`, 2026-11-14): signatures, webhook, `/start` + invite, digest composer, cron fan-out, build-time setup, 16 unit tests — see `TELEGRAM.md`.
- [x] Real `loadDigests` query (2026-11-14) — tomorrow's active orders, balance from live payments, owner + managers with `reminders_on`.
- [ ] Mute toggle in Sozlamalar → Eslatmalar (Phase 2).

## Phase 7 — QA & release

Playwright demo flow (onboarding → calendar → order + advance → day "1 joy" → dashboard balance up), axe on every route, Light/Dark + Telegram theme check, 1:1 Figma review → merge to `main`.

## Needs from Ibrohim (with click-by-click guides when we get there)

1. BotFather: create bot, get token, set Mini App URL, `/setdomain`.
2. Vercel → Settings → Environment Variables: `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (`TELEGRAM_WEBHOOK_SECRET` optional — derived from the token). (Secrets are never pasted into chat.)
3. Before any real studio data: move the database to a provider in Uzbekistan (legal requirement) — Tech §10.
