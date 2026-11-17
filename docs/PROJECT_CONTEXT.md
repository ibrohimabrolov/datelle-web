# Datelle — loyiha konteksti (handoff)

> Yangi chatda shu fayldan boshlang. Oxirgi yangilanish: 2026-11-18.
> Kod: `github.com/ibrohimabrolov/datelle-web` (private) · Jonli sayt: https://datelle-web.vercel.app

> **⚡ 2026-11-11 — yoʻnalish oʻzgardi.** Hozirgi mahsulot — ***Datelle Studio***: dekor studiyalari va floristlar uchun **faqat ichki tizim** (mijoz tomoni yoʻq). MVP: Kalendar · Buyurtma va pul (avans/qoldiq) · egasi uchun Dashboard. Bitta web app: desktop brauzer + Telegram Mini App. Pul — studiya obunasi. Mahsulot rejasi: **`claude/Datelle-MVP-SCOPE.md`** (v0.2) · texnik dizayn: **`claude/Datelle-STUDIO-TECH.md`**. Quyidagi 1–9-boʻlimlar mavjud mijoz saytini (marketplace) tasvirlaydi — u jonli, lekin muzlatilgan.

---

## 1. Mahsulot

**Datelle** (ichki eski nomlari: Chaman, Calla) — Toshkentda tadbir **dekor studiyalari va floristlarni sana boʻyicha** bron qilish marketplace'i. Ibrohim Abrolovning shaxsiy startapi.

- Asosiy gʻoya: **"Avval sana, keyin dekor"** — mijoz sanani tanlaydi, faqat oʻsha kuni boʻsh studiyalar chiqadi.
- Pul modeli (**2026-11-11 dan yangi**): pul **studiyadan** — Datelle Studio. Gipoteza: setup 500 000 soʻm (bir marta) + 299 000 soʻm/oy (3 foydalanuvchi, qoʻshimchasi 49 000) yoki yillik 2 990 000. Founding partner (birinchi 10 ta): setup va 3 oy bepul, keyin umrbod 149 000/oy. Bir martalik katta sotuv rad etildi (agentlikka aylanadi, takroriy daromad yoʻq). Mijozdan pul olinmaydi.
  - *Eski model (kodda hali bor, qayta yoziladi):* mijoz 30% zadatokni platformaga toʻlaydi. Rad etildi: Datelle'ga ishonch yoʻq, studiyalar pulni darhol olishni xohlaydi, boshqa birovning pulini ushlab turish huquqiy jihatdan ogʻir, merchant ulash uzoq.
- Ikki xil soʻrov:
  - **Bron** (`booking`) — tayyor paket, narx aniq, studiya **6 ish soati** ichida javob beradi (22:00–08:00 hisoblanmaydi).
  - **Taklif soʻrovi** (`quote`) — brief (mehmonlar, joy, byudjet, izoh), studiya **24 soat** ichida taklif beradi.
- Kategoriyalar: `dekor`, `floristika`. Tadbir turlari: toʻy, qiz uzatar, tugʻilgan kun va h.k. Tumanlar: Toshkentning 12 tumani.
- Til: interfeys **oʻzbekcha (lotin)**, Toshkent vaqti UTC+5.

**Brend:** hozir kodda `Datelle` (`src/config/brand.ts` — bitta joyda oʻzgaradi). Domen `datelle.uz` va ijtimoiy tarmoqlar hali roʻyxatdan oʻtmagan (placeholder). Brend rangi `#1E5A45` (yashil).

---

## 2. Hozirgi holat (2026-11-08, kod oʻzgarmagan)

**Jonli va ishlaydi** (`main` = `backend` = commit `27b0fbf`):

| Qism | Holat |
|---|---|
| Home (A1) | Figma 1:1, desktop 1440 + mobile. Hero qidiruv, haqiqiy bandlik, natijalar |
| Katalog `/studiyalar` | Filtrlar (sana, tur, tadbir, tuman, byudjet, chiplar, saralash), "Yana N ta", boʻsh holat + konsyerj (lid) |
| Studiya sahifasi `/studio/[slug]` | Galereya, paketlar, oylik kalendar (haqiqiy bandlik), bron paneli, sharhlar |
| Taklif `/studio/[slug]/taklif` | Brief formasi |
| Kirish `/kirish` | Telefon + SMS kod (OTP). Hozir **demo rejim** — kod ekranda chiqadi |
| Soʻrov sahifasi `/sorov/[id]` | Holat, qadamlar, bekor qilish |
| Bronlarim `/bronlarim` | Faol / Oldingilar |
| Hamkorlar `/hamkorlar`, `/hamkorlar/royxat` | Studiya arizasi formasi |
| Statik sahifalar | Kafolat, Biz haqimizda, Yordam (FAQ), Maxfiylik, Oferta |
| **Admin panel `/admin`** | Parol bilan. Soʻrovlarni tasdiqlash/rad etish, studiyalar, arizalar, lidlar |
| SEO | robots, sitemap, OG image, icon, error/404 |

**Baza:** Neon Postgres (Frankfurt), Vercel orqali ulangan. 62 ta studiya (50 dekor + 12 florist), 186 paket, ~8 oylik sintetik bandlik (seed). Real foydalanuvchi va real studiya maʼlumoti hali yoʻq.

**Testlar (oxirgi yugurish — hammasi yashil):** unit 6/6, API integratsiya 25/25, e2e oqim Playwright bilan, 58 sahifa crawl, axe a11y.

---

## 3. Hisoblar va manzillar

| Nima | Qayerda |
|---|---|
| Kod | GitHub `ibrohimabrolov/datelle-web` (private). Claude GitHub App oʻrnatilgan — push ishlaydi |
| Hosting | Vercel, jamoa `abrolov`, loyiha `datelle-web`, **Hobby** tarifi |
| Production | `main` branch → https://datelle-web.vercel.app (har push avtomatik deploy) |
| Preview | boshqa branch'lar → `datelle-web-git-<branch>-abrolov.vercel.app` — **Vercel login ortida**, Claude ocha olmaydi |
| Baza | Neon, `neon-aero-anchor` (Vercel → Storage), Free plan, Frankfurt |
| Admin | https://datelle-web.vercel.app/admin · parol Vercel env'da (`ADMIN_PASSWORD`) |
| Dizayn | Figma `figma.com/design/VfrwfbjWNNyA5BombIor7z/Chaman` — Home frame `240:247`, Admin sahifasi `268:4567`. Datelle Studio — **alohida fayl** `figma.com/design/XNmqL3kbnh0lPpzO6ZQKUR` (Projects team): Cover · 📝 UX audit · Foundations · 💠 Icons (845 ta ikon set × 6 style; ishlatilgan style — **Filled**, chevron/search va nofaol nav ikonlari — Line; Filled va Line variantlar `icon/default` tokeniga bogʻlangan) · Components (14 set + Avatar, Toast; eski Icon/* oʻchirildi, hammasi 💠 Icons'ga swap qilindi; native qatlam: Toggle, Selection (Checkbox/Radio), ListRow, Alert, SearchField, SheetHeader, Dialog, Keyboard/NumPad, System/StatusBar, System/HomeIndicator, Telegram/Header; Button'da Destructive, Segment'da Count) · Mobile (42 ekran, 6 flow; har seksiya tepasida `Docs/Section Header`, screen'lar 100px pastda) · Desktop (7 asosiy + 18 holat). **Tokenlar:** Primitives 97 (neutral, green, amber, red, blue, violet, rose, teal + alpha) · Color 117 (Light + Dark: control, keyboard, bg, text, border, brand, icon, status ×4, state, day, money, event, chart) · Spacing 11 · Radius 5 · Typography 20 (text style'larga bogʻlangan) · Size 17 · Layout 8 (Mobile/Desktop). 2026-11-11 |

**Vercel environment variables** (Production + Preview `backend`):

| Key | Qiymat / manba |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (+ boshqa `DATABASE_*`) | Neon integratsiyasi avtomatik qoʻygan (prefix `DATABASE`) |
| `ADMIN_PASSWORD` | Ibrohim qoʻygan oddiy demo parol — **real ishga tushirishdan oldin almashtirish** |
| `SMS_PROVIDER` | `demo` (kod ekranda chiqadi). Real ishda `eskiz` |
| `OTP_PEPPER` | hali qoʻyilmagan — `eskiz` yoqilganda **majburiy** |
| `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (+ ixtiyoriy `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_MINIAPP_URL`) | *(Datelle Studio bot)* — Ibrohim Production'ga qoʻydi (2026-11-14); BotFather `/setdomain` → datelle-web.vercel.app qilingan. Yoʻq boʻlsa bot/cron 503, build oʻtkazib yuboradi — `docs/studio/TELEGRAM.md` |

---

## 4. Texnik stek

- **Next.js 16.4.5** (App Router, `src/`, `cacheComponents: true`), React 19.3, Tailwind v4, TypeScript.
  - `AGENTS.md`: kod yozishdan oldin `node_modules/next/dist/docs/` ni oʻqish — Next 16 API'lari eskidan farq qiladi.
  - URL maʼlumoti (`useSearchParams`, `usePathname`, `params`, `cookies`) **Suspense ichida** boʻlishi shart, aks holda build yiqiladi.
  - Global tiplar: `PageProps<'/route'>`, `LayoutProps`, `RouteContext<'/api/...'>` (`npx next typegen` bilan yangilanadi).
  - Route handler'larda `unstable_rethrow` (bizning `route()` oʻramida bor).
- **Backend:** monolit — Next route handlers + **Postgres 16** + **Drizzle ORM 0.45** (`casing: snake_case`), `pg`, `zod 4`, `server-only`.
- **Testlar:** `node:test` + `tsx`; Playwright (Chromium muhitda oʻrnatilgan) + `@axe-core/playwright`.

### Muhim tamoyillar
- Statik shell + klientda `/api/*` dan maʼlumot (skeleton bilan). `useToday()` SSR'da `null` — statik HTML'ga sana "yopishib qolmasin".
- Sanalar — ISO string, Toshkent UTC+5 (`src/lib/dates.ts`). Bron oynasi: ertadan 365 kungacha.
- Pul — butun soʻm (`bigint`). Zadatok = narxning 30%i, 1000 ga yaxlitlanadi *(eski model)*.
- Xatolar formati: `{ error: { code, message, fields? } }`, xabarlar oʻzbekcha (foydalanuvchiga koʻrinadi).
- CSRF: mutatsiyalar faqat `application/json` + oʻz `Origin`.
- Rate limit Postgres'da (fixed window) — serverless'da ham ishlaydi.

---

## 5. Repo tuzilishi

```
src/
  app/
    (site)/            # ommaviy sayt: page.tsx (Home), studiyalar, studio/[slug](/taklif), kirish, sorov/[id], bronlarim, hamkorlar, ...
    admin/             # admin panel: page (Umumiy), sorovlar, studiyalar, arizalar, lidlar
    api/               # route handlers (pastda jadval)
    globals.css        # dizayn tokenlari (Figma Colors Light / Light·App) + type scale `t-*`
  components/
    ui/                # Button, Icon (Figma 06 Icons), Logo, Form, Picker (MonthCalendar, FilterField), Calendars, VendorCard, Stepper
    home/              # 11 ta section, Nav (NavLive + Suspense), Footer
    catalog/ vendor/ account/ auth/ partner/ admin/
  data/                # catalog.ts (VENDORS — seed manbai, labellar, filtrlar), images.ts, home.ts, reviews.ts
  lib/                 # dates.ts, workhours.ts, api.ts (useApi, cachedGet, useToday), catalogClient.ts
  server/              # db/schema.ts, db/index.ts, http.ts, auth.ts, sms.ts, phone.ts, ratelimit.ts, catalog.ts, requests.ts, admin.ts, seed.ts
  config/              # brand.ts, site.ts
drizzle/               # SQL migratsiyalar (0000_init.sql)
scripts/predeploy.ts   # Vercel build oldidan: migrate + (baza boʻsh boʻlsa) seed
tests/                 # unit.test.ts, api.test.ts
BACKEND.md             # backend batafsil: env, model, API, admin, deploy
```

Datelle Studio kodi (**main'da, jonli** — https://datelle-web.vercel.app/panel, 2026-11-15): `src/app/panel/` (layout + `(app)` shell, `kirish`, `onboarding`), `src/components/studio/` (PanelProvider, Shell, Button, icons, telegram, screens/*), `src/server/panel/` (auth, service), `src/server/telegram/` (bot), `src/app/api/panel/*`, `/api/telegram/webhook`, `/api/cron/daily`; dizayn tizimi `src/studio/tokens.css` + `src/app/panel/studio.css`; jadvallar `drizzle/0001_studio.sql`. API jadvali — `BACKEND.md` oxirida.

---

## 6. Maʼlumotlar modeli (qisqa)

`users` (phone `+998…`, role client/vendor/admin) · `sessions` (faqat sha256 token; cookie `dt_session`, 30 kun, sliding) · `otp_codes` (hash, 5 daq, 5 urinish, 60 s cooldown) · `vendors` (slug, category, district, priceFrom, dailyCapacity=3, rank, status active/hidden, verified) · `packages` · `vendor_days` (vendor+kun: `booked`, `blocked`; qator yoʻq = boʻsh kun) · `requests` · `request_events` (audit) · `partner_applications` · `leads` · `rate_limits`.

**Kun holati:** `blocked` yoki `booked ≥ capacity` → band; bitta joy qolsa → "1 joy".

**Soʻrov holatlari:**
```
pending → confirmed → paid → completed
   ↘ declined   ↘ declined / cancelled   ↘ cancelled
pending → expired (muddat oʻtsa, oʻqishda lazy qoʻllanadi)
pending/confirmed → cancelled (mijoz)
```
- Bitta mijoz + studiya + sana uchun faqat bitta ochiq soʻrov (partial unique index).
- **Tasdiqlash** (`→ confirmed`) studiyaning kunlik joyini band qiladi (`booked + 1`); confirmed/paid'dan chiqish joyni qaytaradi.
- Kod formati: `DT-B-######` (bron), `DT-R-######` (taklif).
- Datelle Studio bu jadvallardan foydalanmaydi — oʻz jadvallari bor (`studios`, `orders`, …). Kelajakda bogʻlash uchun `studios.vendor_id` (hozir null).

---

## 7. API

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | — |
| GET | `/api/vendors/search?sana&tur&tadbir&tuman&byudjet&f&saralash&limit&offset` | — (30 s cache) |
| GET | `/api/availability?from&days&…` (≤ 62 kun) | — |
| GET | `/api/vendors/:slug/calendar?month=YYYY-MM` | — |
| POST | `/api/auth/otp` `{phone}` · `/api/auth/verify` `{phone,code,name?}` · `/api/auth/logout` | — / cookie |
| GET | `/api/me` | cookie |
| GET/POST | `/api/requests` · GET `/api/requests/:id` · POST `/api/requests/:id/cancel` | egasi |
| POST | `/api/partners` (5/soat/IP) · `/api/leads` (10/soat/IP) | — |
| POST | `/api/admin/login` `{password}` (5 urinish / 15 daq / IP) · `/api/admin/logout` | — |
| GET | `/api/admin/{me,stats,requests,vendors,applications,leads}` · `/api/admin/vendors/:id/days` | admin |
| POST | `/api/admin/requests/:id` `{to}` · `/api/admin/vendors/:id` · `/api/admin/vendors/:id/days` · `/api/admin/applications/:id` · `/api/admin/leads/:id` | admin |

---

## 8. Admin panel (`/admin`)

- Kirish: bitta umumiy parol (`ADMIN_PASSWORD`), stateless HMAC cookie `dt_admin` (7 kun). Parol almashsa — hamma chiqib ketadi. Env boʻsh boʻlsa admin oʻchiq (404).
- **Umumiy:** javob kutilayotganlar, bugun / 7 kun, tasdiqlanish ulushi, yangi arizalar, ochiq lidlar, faol studiyalar.
- **Soʻrovlar:** filtr (Ochiq / Javob kutilmoqda / Zadatok kutilmoqda / Toʻlangan / Yopilgan / Hammasi), qidiruv; Tasdiqlash, Rad etish, Zadatok olindi, Bajarildi, Bekor qilish.
- **Studiyalar:** yashirish/koʻrsatish, kunlik sigʻim (−/+), "Tekshirilgan" belgisi, 8 haftalik kunlarni yopish/ochish.
- **Hamkor arizalari:** yangi → koʻrib chiqilmoqda → qabul / rad. **Lidlar:** "Bogʻlanildi".
- Studiya tomoni hali yoʻq — **hozircha studiya oʻrniga admin tasdiqlaydi** (marketplace muzlatilgan, shuning uchun dolzarb emas).

---

## 9. Ish jarayoni (yangi chatda Claude uchun)

1. Repo'ni sessiyaga ulash (`add_repo` → `ibrohimabrolov/datelle-web`, `access: push`) va clone qilish.
2. `npm install`. Lokal Postgres 16: klasterni ishga tushirish, `datelle/datelle` user, `datelle` va `datelle_test` bazalar.
3. `.env.local`:
   ```
   DATABASE_URL=postgresql://datelle:datelle@localhost:5432/datelle
   SMS_PROVIDER=console
   OTP_PEPPER=dev-only-pepper-change-me
   ADMIN_PASSWORD=local-admin
   ```
4. `npm run db:deploy` (migratsiya + seed) → `npm run dev` yoki `npm run build && PORT=3100 npm start`.
5. Tekshirish: `npx tsc --noEmit`, `npx eslint src scripts tests`, `npm test`, server ishlab turganda `npm run test:api`.
6. Yangi ish → alohida branch'da, tekshirilgach `main`ga. **`main`ga push = jonli saytga chiqadi.** 2026-11-16 dan Ibrohim ruxsati bilan Claude PR'ni oʻzi merge qiladi (`gh api -X PUT …/pulls/N/merge`) — faqat testlar + axe yashil va Vercel preview `success` boʻlganda; merge'dan keyin production deploy va `/api/health` tekshiriladi. Neon Free: 10 branch limiti — merge qilingan PR'ning `preview/…` branch'ini oʻchirish kerak (Claude eslatadi).
7. Jonli tekshiruv: `curl https://datelle-web.vercel.app/api/health` → `{"db":"up"}`; deploy holati: `gh api repos/ibrohimabrolov/datelle-web/commits/<sha>/statuses`.
8. Sxema oʻzgarsa: `schema.ts` → `npm run db:generate` → yangi `drizzle/*.sql` commit qilinadi; Vercel build uni avtomatik qoʻllaydi.

**Muhit tuzoqlari:**
- `pkill -f next` shell'ning oʻzini oʻldiradi — PID boʻyicha oʻldirish.
- Konteyner qayta ishga tushsa Postgres oʻchib qoladi — `pg_ctlcluster 16 main start`.
- Seed'ni prod'da qoʻlda yugurtirmang: u studiya maʼlumotlarini qayta yozadi (predeploy faqat boʻsh bazada seed qiladi).
- Shu fayl ikki joyda: Project (`Datelle-PROJECT_CONTEXT.md`) va repo (`docs/PROJECT_CONTEXT.md`) — ikkalasini birga yangilash. 2026-11-12 da sinxronlandi. `claude/Datelle-MVP-SCOPE.md` va `claude/Datelle-STUDIO-TECH.md` hozircha faqat Project'da.

---

## 10. Qabul qilingan qarorlar

- Framer emas — **kod** (Next.js), Figma bilan 1:1.
- Hosting hozircha **Vercel**, baza **Neon** — faqat demo/test maʼlumot uchun.
- Login — telefon + SMS kod (parolsiz). Admin — oddiy parol (v1 soddalik uchun).
- Studiya tomoni qurilguncha soʻrovlarni admin boshqaradi.
- Mock bandlik olib tashlangan; hamma raqamlar bazadan.
- **2026-11-11:** platforma zadatok olmaydi; pul studiyadan (obuna).
- **2026-11-11:** keyingi mahsulot — *Datelle Studio*, **faqat ichki tizim, mijoz tomoni aralashmaydi** (Ibrohim qarori). MVP = Kalendar · Buyurtma va pul · egasi Dashboard'i. Bitta responsive web app (desktop + Telegram Mini App). Rollar: owner, manager. Login Telegram orqali (SMS'siz). Kod `/panel` boʻlimida, marketplace kodiga tegilmaydi.
- **2026-11-11:** narx — setup + oylik obuna + yillik chegirma (bir martalik katta summa emas).
- **2026-11-11:** kodni qurishdan oldin Figma prototip bilan 10–15 studiyaga "founding partner" demosi; ≥ 5 "ha" boʻlsa kod. Mijoz sayti jonli qoladi, yangi ish qilinmaydi, sotuvda koʻrsatilmaydi.
- **2026-11-12:** kod demo natijasidan qatʼi nazar quriladi (mahsulot portfolio case sifatida ham qoladi); demolar parallel davom etadi va v1.1 ni belgilaydi. Kod faqat Ibrohim Figma'ni koʻrib chiqqandan keyin boshlanadi. Reja: `docs/studio/IMPLEMENTATION-PLAN.md`, handoff: `docs/studio/DESIGN-HANDOFF.md`, tokenlar: `src/studio/tokens.css` (branch `studio/prep`).
- **2026-11-12:** Figma prototip ulandi — Mobile 5 flow (push = chapga siljish 300ms, sheet/state = smart animate 300ms, tab = dissolve 150ms, Telegram BackButton = Back), Desktop 5 flow (sahifa = dissolve 200ms, panel/state = smart animate 300ms, saqlash → 0.9s timeout). Desktop'ga oddiy `S3 · Kalendar` (panelsiz) qoʻshildi.
- **2026-11-12:** Figma'da `📣 Marketing` sahifasi: 8 slaydli pitch deck (studiyalar uchun, oʻzbekcha, real ekranlar bilan; Present → "Pitch deck", → / ← bilan) va outreach grafikalari (feed 1080×1350, story 1080×1920). Desktop sahifasi 6 ta flow seksiyasiga (4 ustunli grid) qayta tartiblandi.
- **2026-11-14:** Telegram bot poydevori (`studio/telegram`, Phase 6 oldinga olindi): initData/Login Widget imzolari, webhook `/start` + taklif (`/start inv_…`), kunlik digest ("Ertaga, 15-noyabr, ya — N ta tadbir … Qoldiq: X soʻm", boʻsh kunda xabar yoʻq), `/api/cron/daily` (`vercel.json` 15:00 UTC), webhook production build'da avtomatik sozlanadi (`scripts/telegram-setup.ts`). Webhook secret token'dan hosil qilinadi — Ibrohim faqat 3 ta env qoʻyadi. Haqiqiy maʼlumot (`loadDigests`) Phase 1 sxemasidan keyin. Batafsil: `docs/studio/TELEGRAM.md`.
- **2026-11-14:** 1-bosqich (`studio/foundation`, PR #4): sxema + migratsiya (7 jadval, `sessions.scope` — panel tokeni marketplace'da ishlamaydi), Telegram orqali kirish (Mini App initData / desktop Login Widget, cookie `dt_panel`), `requireStudio` (boshqa studiya → 404), onboarding (bitta studiya, 90 kun founding trial), `/panel` shell (Sidebar / floating TabBar, Figma ikonlari 1:1, Telegram tema + MainButton), Kirish va Onboarding ekranlari Figma bo'yicha, Sozlamalar (faqat koʻrish). Kunlik eslatma endi haqiqiy buyurtmalardan. Testlar: unit 22, panel API 13, marketplace API 25, axe WCAG 2.2 AA — hammasi yashil. Figma bug: Onboarding'dagi tanlangan radio belgisi 14×22 ga ezilgan — kodda 22×22.
- **2026-11-14:** 3-bosqich — Kalendar (`studio/calendar`, PR #5, #4 ni oʻz ichiga oladi): oy grid (mobile DayCell / desktop DayCell Large), kun paneli (desktop 480 / mobile sheet), kunni yopish (sabab chip + izoh) va ochish, undo toast, klaviatura navigatsiyasi, bot havolasi `?sana=` kunni ochadi. API `GET /api/panel/calendar`, `PUT /api/panel/days/:date`, migratsiya `0002_day_reason.sql`. Figma copy tuzatildi: "Mijozlar bu sanani band deb koʻradi" (Studio'da mijoz tomoni yoʻq). Testlar: unit 27, panel API 18, marketplace 25, axe 0.
- **2026-11-14:** 4-bosqich — Buyurtmalar va toʻlovlar (`studio/orders`, PR #6, #5 ni oʻz ichiga oladi): roʻyxat (desktop jadval, mobile hafta guruhlari, segment + qidiruv + saralash), yangi buyurtma formasi (avans, jonli qoldiq, sigʻim ogohlantirishi, saqlanmagan oʻzgarish himoyasi), buyurtma paneli (qoldiq kartasi, qoʻngʻiroq/Telegram, toʻlovlar, ⋯ menyu, tarix), toʻlov modali, bekor qilish dialogi, undo toast'lar, Sidebar'da qoldiq badge'i. Kalendardan forma va buyurtma joyida ochiladi — demo oqimi (kun → buyurtma + avans → "1 joy") toʻliq ishlaydi. Toʻlovni oʻchirish: egasi har doim, menejer faqat oʻzi qoʻshganini 10 daqiqa ichida (undo). Testlar: unit 30, panel API 28, marketplace 25, axe 0.
- **2026-11-14:** 5-bosqich — Dashboard (`studio/dashboard`, PR #7, #6 ni oʻz ichiga oladi): KPI (bu oy tushum + oʻtgan oyning shu kunlariga nisbatan oʻzgarish, qoldiq, keyingi 30 kun), keyingi 7 kun, qoldiq bor (kechikkanlar ogohlantirishi), Tushum grafigi (Hafta/Oy/Yil), boʻsh holatda 4 qadamli sozlash roʻyxati. Faqat egasi koʻradi (menejer 403). Tushum = haqiqatan olingan pul (toʻlov sanasi boʻyicha). Mobile'da Sozlamalar: header'da tishli gʻildirak + Telegram ⋯ menyusi. Testlar: unit 32, panel API 31, marketplace 25, axe 0.
- **2026-11-15:** 2-bosqich — Sozlamalar va jamoa (`studio/team`, PR #8, #7 ni oʻz ichiga oladi): studiya nomi/yoʻnalishi/sigʻimini tahrirlash (faqat egasi, audit), menejer taklifi — bir martalik link 7 kun (bazada faqat hash), "Nusxalash" / "Telegram'da yuborish", faol takliflarni bekor qilish, menejerni chiqarish (tasdiq bilan, kirishi darhol yopiladi), har kim oʻz kechki eslatmasini yoqadi/oʻchiradi, bir nechta studiya boʻlsa almashtirish. Yangi `/panel/taklif` ekrani: studiya + kim taklif qildi + menejer huquqlari, "Qoʻshilish" → Kalendar (Dashboard yoʻq); link eskirgan/ishlatilgan/notoʻgʻri holatlari. Figma'dan chetlanish: desktop'da 3 ta eslatma toggle chizilgan, botda faqat kechki bor → bitta toggle. Testlar: unit 32, panel API 38, marketplace 25, axe 0, E2E (egasi taklif qiladi → menejer qoʻshiladi → chiqariladi).
- **2026-11-15:** 7-bosqich — QA (production build'da): toʻliq demo oqimi desktop + mobile'da oxirigacha oʻtdi (onboarding → buyurtma + avans → "1 joy" → Dashboard → toʻlov → Bajarildi; menejer taklif bilan qoʻshilib, oʻsha kunni band qiladi). 11 ta sahifa × 6 ta ekran kengligi × light/dark = 132 tekshiruv — axe 0, gorizontal scroll yoʻq, console xatosi yoʻq. Ruxsatlar jadvali testi (19 endpoint: mehmon 401 / begona studiya 404 / menejer 403 / CSRF) — panel API 44. QA'da tuzatildi: Bajarildi buyurtma kalendardan yoʻqolib, joyni boʻshatib qoʻyardi; notoʻgʻri `/panel/...` havolasi marketplace 404'iga tushardi; dark mode'da 2 ta kontrast; 1024–1279px'da Dashboard ustunlari va jadvaldagi summalar kesilardi. Figma'dan ataylab qoldirilgan (v1.1): jadval checkbox + bulk, Buyurtmalar'da oy filtri.
- **2026-11-15:** Datelle Studio v1 **main'ga qoʻshildi va jonli** (PR #8, 13:27). Jonli tekshiruv: baza ishlayapti (migratsiyalar qoʻllandi), bot @datelle_bot ulangan, test-kirish oʻchiq, cron sirsiz 401, `/panel` sahifalari ochiladi, mijoz sayti oʻzgarmagan. Jami: 14 commit, 99 fayl, ~13 500 qator.
- **2026-11-15:** Figma — studiya egalari uchun **Landing** (`🌐 Landing` sahifasi: desktop + mobile, light + dark; uslub: Nocta tipografikasi + T-Bank minimal matte 3D, typescale v2 `Landing/*`). Mahsulotga **3D illyustratsiyalar**: `Illustration/3D` component set (9 ta: kalendar, pul, jamoa, bot, tolangan, topilmadi, xato, muddat, qulf), Mini App va Desktop state ekranlarida ikonka oʻrniga. Landing hali kodda yoʻq.
- **2026-11-15:** Kod — `studio/illustrations` branch: 3D'lar `public/studio/3d/*.webp` (512px, ~23 KB), yangi `StateBlock` komponenti (desktop: 3D 200 · gap 24 · H1 28/36 · body 15/22 max 480 · Secondary M; mobile: 3D 120 · gap 12 · H2 20/28). Figma bilan 1:1: Dashboard/Kalendar/Buyurtmalar · xato ("… yuklanmadi" + "Qayta urinish" ↻; xato paytida "Buyurtma qoʻshish" disabled, kalendar legend yashirin), Buyurtmalar · topilmadi ("Qidiruvni tozalash" + qidiruvda × tugma), · qoldiq yoʻq ("Hamma toʻlangan" + "Barcha buyurtmalar"). **Kirish v3** (Figma + kod, Ibrohim bergan login referensi asosida): 160° gradient (green/950 → 900 → 700) + 48px grid (oq 3%, chetlari radial fade) fon → markazda karta 1040×680 (bg/canvas, radius 32 = yangi `radius/3xl`, padding 12) = chapda media panel 480 (bg/surface, radius 24) — 3 ta 3D slayd (kalendar / pul / bot, matni bilan) har 5 soniyada almashadi (hover/focus/yashirin tab'da toʻxtaydi, reduced-motion'da harakatsiz; Figma `Login/Slide` component set: After delay 5s → Smart animate), oʻngda forma (padding 48/64, subtitle olib tashlandi — Ibrohim) + "Bu qurilmada 30 kun kirgan holda qolasiz" (xato holatida yoʻq); 1024px dan kichikda faqat forma. Xato holati: Danger alert + "Qayta urinish". Eski qora panel dark mode'da oq blokka aylanardi. Tuzatildi: Danger alert ichidagi "!" belgisi qora chiqardi (CSS specificity). "Kirish · ruxsat yoʻq" kodda hali yoʻq (chiqarilgan aʼzoni backend belgilamaydi). Tekshiruv: axe 28/28, panel API 44, unit 32. **Vercel preview** 2026-11-15 dan "One or more integration resources failed to provision" bilan yiqiladi — kod emas: Neon integratsiyasi har preview uchun baza branch'i ochadi, Free plan limiti toʻlgan (eski preview branch'larni oʻchirish kerak).
- **2026-11-16:** Kompyuterdan kirish — **bot orqali tasdiqlash** (`studio/bot-login`): Telegram Login Widget tasdiq xabarini Telegram'ning oʻzi yuboradi va u Ibrohimga kelmadi. Yangi asosiy yoʻl: "Telegram orqali kirish" → 5 daqiqalik soʻrov (jadval `panel_logins`, migratsiya `0003`) → QR + `t.me/datelle_bot?start=login_<id>` + 4 xonali kod → botda «Tasdiqlash» → shu brauzer (httpOnly `dt_login` cookie) 2 soniyada bir soʻrab, sessiya oladi. Himoya: link boshqa brauzerga sessiya bermaydi, tugmani faqat linkni ochgan akkaunt bosadi, kod ikkala ekranda, bir tasdiq = bir sessiya. Webhook endi `callback_query` ham oladi (production build'da qayta roʻyxatdan oʻtadi). Eski widget — "Telefon raqam bilan kirish" havolasi. Kirish kartasi ichida, forma ustunining oʻng tepasida (logo qatori bilan bir chiziqda) **til + mavzu** paneli (Figma `Login/Toolbar` 212:691; ikkala pill 40px, bg/surface + bg/elevated): (til tugmasi keyin olib tashlandi); mavzu **default light** (OS dark boʻlsa ham — Ibrohim qarori), tanlov brauzerda saqlanadi va butun panelga taʼsir qiladi, birinchi chizishdan oldin qoʻllanadi (flash yoʻq); Telegram ichida Mini App Telegram mavzusiga ergashadi. Figma: `S1 · Kirish · bot` (210:6574). Testlar: panel API 46, unit 33.
- **2026-11-16:** Polish (`studio/polish-states`): **Mini App 3D** — Onboarding (kalendar 112), Taklif (jamoa 128), taklif xato holatlari (eskirgan/ishlatilgan → muddat, notoʻgʻri/xato → xato, allaqachon aʼzo → jamoa; 140), Dashboard boʻsh setup (kalendar 88 desktop / 64 mobile); mobile StateBlock Figma'ning yangi spec'iga: 3D 140 · gap 24 · matn gap 4 (Figma'dagi Qoldiq yoʻq / Topilmadi mobile ham shunga keltirildi). **Kirish yopilgan** (`/panel/yopilgan`): studiyasi qolmagan va oxirgi 30 kunda egasi tomonidan chiqarilgan odamga (`studio_events` member/delete) — Info alert "X egasi sizni jamoadan chiqardi", "<Ega>ga yozish" (Telegram username boʻlsa), "Oʻz studiyamni ochish" → onboarding; `/api/panel/me` → `removed`. **Mavzu** Sozlamalar → Koʻrinish'da ham (faqat web; Telegram'da yashirin). **RU tugmasi olib tashlandi** — oʻchiq tugma "buzilgan" koʻrinardi; tarjima tayyor boʻlganda qaytadi. "Obuna tugadi" kodda yoʻq — toʻlov/obuna mantiqi hali yoʻq (trial 90 kun). Testlar: panel API 46, unit 33, axe 28 + 7 yangi ekran.
- **2026-11-17/18:** Landing (Figma `🌐 Landing`): responsive tizim — Layout collection'da **Tablet** mode (810), `section/*`, `grid/col-min*`, `type/*`, `control/min-h`, `nav/*` tokenlari; Mobile/Tablet = bitta `Landing · Mobile` component (Tablet — instance, Layout mode); yangi `Landing/MenuButton`, `Landing/Menu`, `Landing/BottomBar` (sticky CTA faqat mobile); touch target'lar ≥44, hero lead kontrasti 3.3 → 17.6:1; Hamkorlar mobile/tablet'da yashirin (logolar kelguncha). Canvas: 01 Desktop · 02 Mobile/Tablet · 03 Assets; inspiration → Moodboard, eski 3D → Archive.
- **2026-11-18:** Landing kodi — `studio/landing` branch, manzil **`/biznes`** (Ibrohim qarori; marketplace `/` ga tegilmaydi). Hozircha **desktop 1:1** (1440/1200, light + dark, tizim mavzusiga ergashadi): `src/app/biznes/` (layout + `landing.css`, `--lp-*` tokenlari Figma'dan), `src/components/landing/*` (Hero, StickyHeader > 760px, Tour tab'lari, FAQ accordion, …), rasmlar `public/landing/*.webp` (tour ekranlari Figma stage'idan @2x, har mavzu uchun). Mobile layout, BG pattern va section motion — keyingi bosqich (avval Figma'da, Ibrohim OK'idan keyin kod). Mobile tayyor bo'lmaguncha `main`'ga qo'shilmaydi.
- **v1.1 kandidatlari:** jamoani tadbirlarga taqsimlash, rekvizit hisobi, xarajatlar — demolar tartibni hal qiladi.

---

## 11. Ochiq masalalar va keyingi qadamlar (ustuvorlik tartibida)

1. **Figma: Datelle Studio** — UX toʻliq + **UI v2 (mobile)** tayyor (2026-11-11). UI yoʻnalishi: **oq canvas** (bg/canvas = neutral/0), kartalar/maydonlar sovuq kulrang bg/surface (#F1F1F3), **chegara yoʻq**; neutral rampa iliqdan sovuq (zinc-ga yaqin) tonga oʻtkazildi; tepadagi yashil glow olib tashlandi; tab bar oq (bg/elevated) + Float soyasi; pill tugmalar, qora pill segment; buyurtma sana plitkasi tadbir rangida. Native komponentlar (user qoʻshgan seksiya) tahlil qilindi: KYC/telefon/SMS/fayl yuklash/ijtimoiy tarmoq/davlat tanlash/rus tab'lari va TabBar/Avatar/Button dublikatlari oʻchirildi; kerakli 11 tasi tokenlar bilan qayta qurildi va ekranlarga qoʻyildi: barcha 42 ekranda StatusBar/HomeIndicator/Telegram header instance; Sozlamalar → 'Kechki eslatma' Toggle; Toʻlov qoʻshish → NumPad klaviatura; Forma · kun band → Alert (warning); Bekor qilish / Aʼzoni chiqarish → Dialog; Qidiruv → SearchField; Buyurtmalar → 'Qoldiq bor 7' counter. **A11y/consistency audit (2026-11-11):** P0/P1 root'dan tuzatildi — caption 12px (`font/size/2xs`), `control/track-off` va yangi `border/control`, `chart/1-weak` = neutral/green 500, Destructive → `status/danger-solid`, Button/IconButton/Chip/ListRow'ga Pressed·Disabled·Loading state'lari, yopiq kunda lock belgisi, spacing ~1880 qiymat `space/*`ga bogʻlandi, kalendar 360px'da sigʻadi. Grafik `chart/1-weak`/`chart/3-strong` va `day/booked-bg` Dark mode'da AA'ga keltirildi; Input/Toggle/Selection'ga Disabled, Segment'ga Pressed qoʻshildi. **Barcha 57 screen auto layout'da** (mobile: vertical, Content grow + pastki bar oqimda, overlay'lar absolute+constraints; desktop: Sidebar + Main fill). **Mobile yopildi (2026-11-11):** ichki screen'larda Telegram BackButton (24 ta), content ichidagi orqaga/yopish olib tashlandi; barcha asosiy action'lar `Tab bar` (MainButton/SecondaryButton) component'ida, sheet'lar bar ortida pastgacha; touch target'lar ≥44 (IconButton, Button M, Chip, Segment 36/44 track, Stepper, Clear, matnli linklar → Ghost M), kalendar katagi 360px'da 44; filtr → scroll chip + count; 7 ta yangi state screen (Buyurtmalar/Dashboard loading, Toʻlov qoʻshildi, Toʻlov xato, Nom saqlandi, Link nusxalandi, Saqlanmoqda). Mobile jami 49 screen. **Desktop UI v2 (2026-11-11):** chegarasiz kartalar/jadval/qidiruv, oq side panel + kulrang kartalar, DayCell Large kulrang katak + oq chip (`day/booked-chip`), Button/IconButton/Chip/Segment/NavItem'ga Hover va Focus (2px `border/focus`), spacing 836/1027 bogʻlangan, `bg/skeleton-on-surface` token. 7 ta yangi desktop state: Menejer qoʻshish (modal), Aʼzoni chiqarish (dialog), Tarix (panel), Kirish · ruxsat yoʻq, Toʻlov · xato (modal), Saqlandi (toast), Buyurtmalar · yuklanmoqda — jami 22 desktop screen. Desktop pointer target qoidasi: WCAG 2.5.8 (≥24px). **Desktop enhance + flow tekshiruvi (2026-11-11, inspiration: Moodboard + Omon CRM):** NavItem'ga Count badge (Sidebar'da "Studiya" boʻlim sarlavhasi, Buyurtmalar · 9; boʻsh/yuklanmoqda/xato holatlarida yashirin), KpiCard'ga Delta chip (↑ 18%), Dashboard'ga "Tushum" bar chart (12 oy, Hafta/Oy/Yil segment, joriy oy tooltip) va Qoldiq kartasida jami + "3 tasi kechikdi" Alert; Dashboard · boʻsh → Setup checklist (1/4, progress, 4 qadam); Buyurtmalar jadvaliga toolbar (sana filtri) + pagination. Root fix: Button/IconButton **Secondary** endi `bg/elevated` + `border/default` (kulrang kartada koʻrinmay qolardi). Maʼlumot izchilligi: hamma joyda 9 ta qarzdor, jami qoldiq 31 300 000 (avval 7 / 9 / 21,3 mln aralash edi — mobile ham). Yangi flow'lar: Kunni yopish (panel: sabab chip + izoh), Dashboard · yuklanmoqda, Dashboard · xato (Qayta urinish), Sozlamalar → Eslatmalar (3 Toggle) + Hisob → Chiqish. Studiya yaratish desktop'da ataylab yoʻq — Mini App'da (Kirish ekranidagi @datelle_bot havolasi). Jami 25 desktop screen. **Desktop audit (2026-11-12):** 3 P0 / 22 P1 / 18 P2. P0/P1 root'dan tuzatildi: yangi token `state/pressed-solid` / `state/hover-solid` (solid fill'da doim qoraytiradi; Dark Destructive pressed 4.45 → 8.18); focus = offset ring (2px boʻshliq + 2px `border/focus`, absolute "Focus ring" child) — Button/IconButton/Chip/NavItem + yangi Focus variantlar: Segment, Toggle, Selection, SearchField; `DayCell Large`'ga `Interaction` (Default/Hover/Focus/Selected) + Today = toʻldirilgan raqam markeri + Limited'da "1 joy" yozuvi; yangi `DataTable/Row` (Default/Hover/Focus/Selected, text props) va `DataTable/Head` (sort) — 8 ta jadval screen'ida detached qatorlar almashtirildi; Search → SearchField instance; Toast'ga Action (undo); Sidebar'ga `Role=Owner/Manager`. Kalendar grid FILL (1280'da overflow yoʻq), Main maxWidth 1200 (= scope'dagi kontent 1120). Yangi screen'lar: Buyurtmalar/Kalendar/Kirish · xato, Yangi buyurtma · xato/saqlanmoqda/chiqish (unsaved guard), Toʻlov qoʻshildi (toast + Bekor qilish), Kalendar/Sozlamalar · menejer. Panel/modal'larga keyboard annotation. **Desktop yopildi (2026-11-12):** OK'lar bajarildi — Input/SearchField 1px `border/control` (4.57:1); yangi `PanelHeader` (Back → Title → ⋯ → X, hamma panel 480), `PaymentRow` (⋯ = tahrirlash/oʻchirish, menejerda yashirin), `ConfirmDialog` (420, tugmalar oʻngda; 3 ta dialog); DataTable'ga checkbox ustuni + `Loading` variant + bulk bar screen'i; Dashboard'da Columns grafikdan yuqorida. Regressiyalar tuzatildi: Booked hover → `state/hover-solid`, tanlangan qator bar → `icon/brand`, focus ring radiuslari token'da (yangi `radius/ring-lg`=20), DayCell padding `space/12`/gap `space/8`, Toast action hit area 26px. Token: Dark `border/subtle` → neutral/800, Dark `chart/1-weak` → green/500, yangi `space/80`, `space/96`, text style `Display/Hero` 48/56; NavItem active fill → `bg/elevated`. Barcha desktop spacing/radius token'ga bogʻlandi (off-scale snap: 2→4, 6→8, 10→8/12, 14→16, 28→24, 56→48); qolgan istisno — faqat grafik Y-axis geometriyasi (42, 7). Yangi screen'lar: Buyurtmalar · tanlangan, · qoldiq yoʻq, Kun yopildi (toast + undo). Hisoblagichlar (37 screen): bogʻlanmagan fill/stroke/radius/text style = 0, spacing = 4 (grafik), 12px'dan kichik matn = 0. Qolgan P2/v1.1: sidebar collapsed (72px), forma modal'lari (Toʻlov/Menejer/Obuna) hali frame, tabular raqamlar — dev'da `tabular-nums`. Jami 37 desktop screen. **Cover v2 (2026-11-12):** chuqur yashil (`brand/pressed`) fon + kalendar-katak pattern, sarlavha "Sana. Buyurtma. Pul." (Pul — `day/limited-bg`), real Desktop Dashboard + Mobile Kalendar product shot, Toast accent, statistika (49 / 37 / 35 / 122); eski cover Archive'da. Keyingi: prototip (mobile + desktop flow'lar) → 10–15 studiyaga demo.
2. **25 ta studiya roʻyxati → 15 ta demo** (2-hafta). Javoblar gipotezalar jadvaliga (scope 1-boʻlim). Eng muhim savollar: qarz/qoldiq ogʻrigʻi (H2), rekvizit (H4) va jamoa (H5) — qaysi biri kuchliroq.
3. **Go / no-go** — ≥ 5 "ha" → scope v0.3 → MVP kodi tech doc 9-boʻlim tartibida (3–5-hafta).
4. **Maʼlumotlar joylashuvi** — birinchi founding partner real mijoz maʼlumotini kiritishidan **oldin** bazani Oʻzbekistondagi provayderga koʻchirish.
5. **Datelle Studio v1 jonli** (PR #8 merge, 2026-11-15). Keyingi: Ibrohim @datelle_bot → `/start` → studiya + 1 buyurtma bilan jonli sinov; Vercel Hobby tijoriy foydalanishga ruxsat bermaydi — birinchi pullik studiyadan oldin Pro'ga oʻtish; real mijoz maʼlumotidan oldin bazani Oʻzbekistonga koʻchirish (4-band).
6. **Domen** — Login Widget va sotuv uchun barqaror domen (`datelle.uz` yoki `studio.datelle.uz`).
7. Marketplace boʻyicha (muzlatilgan): zadatok matnlari, SMS (Eskiz), Payme/Click, foto yuklash, shaxsiy admin akkauntlari, Home illyustratsiyalari, Vercel Hobby → Pro — faqat marketplace'ga qaytilsa.

---

## 12. Ibrohim bilan ishlash

- Senior product/UI dizayner; **kod, deploy, GitHub, server boʻyicha kuchli emas** — texnik qadamlarni oddiy tilda, "qayerni bosish" darajasida tushuntirish (Vercel/Neon ekranlarini skrinshot qilib yuboradi).
- Javob: **oʻzbekcha**, dizayn/texnik atamalar inglizcha. Qisqa, aniq, fikr bilan; zaif yoʻnalishda eʼtiroz bildirish. Roʻyxat-variantlar faqat soʻralganda.
- Dizayn standarti: minimal, yuqori kontrast, 8pt ritm, semantik tokenlar, WCAG AA; aniq qiymatlar (px, hex, weight).
- Sir (parol, kalit) chatga yozilmaydi — Vercel env'ga oʻzi qoʻyadi.
