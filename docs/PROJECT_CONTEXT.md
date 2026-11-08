# Datelle — loyiha konteksti (handoff)

> Yangi chatda shu fayldan boshlang. Oxirgi yangilanish: 2026-11-08.
> Kod: `github.com/ibrohimabrolov/datelle-web` (private) · Jonli sayt: https://datelle-web.vercel.app

---

## 1. Mahsulot

**Datelle** (ichki eski nomlari: Chaman, Calla) — Toshkentda tadbir **dekor studiyalari va floristlarni sana boʻyicha** bron qilish marketplace'i. Ibrohim Abrolovning shaxsiy startapi.

- Asosiy gʻoya: **"Avval sana, keyin dekor"** — mijoz sanani tanlaydi, faqat oʻsha kuni boʻsh studiyalar chiqadi.
- Pul modeli: mijoz **30% zadatok** toʻlaydi (Payme/Click), zadatok platformada himoyalanadi; studiya kelmasa qaytariladi.
- Ikki xil soʻrov:
  - **Bron** (`booking`) — tayyor paket, narx aniq, studiya **6 ish soati** ichida javob beradi (22:00–08:00 hisoblanmaydi).
  - **Taklif soʻrovi** (`quote`) — brief (mehmonlar, joy, byudjet, izoh), studiya **24 soat** ichida taklif beradi.
- Kategoriyalar: `dekor`, `floristika`. Tadbir turlari: toʻy, qiz uzatar, tugʻilgan kun va h.k. Tumanlar: Toshkentning 12 tumani.
- Til: interfeys **oʻzbekcha (lotin)**, Toshkent vaqti UTC+5.

**Brend:** hozir kodda `Datelle` (`src/config/brand.ts` — bitta joyda oʻzgaradi). Domen `datelle.uz` va ijtimoiy tarmoqlar hali roʻyxatdan oʻtmagan (placeholder). Brend rangi `#1E5A45` (yashil).

---

## 2. Hozirgi holat (2026-11-08)

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

**Baza:** Neon Postgres (Frankfurt), Vercel orqali ulangan. 62 ta studiya (50 dekor + 12 florist), 186 paket, ~8 oylik sintetik bandlik (seed). Real foydalanuvchi maʼlumoti hali yoʻq.

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
| Dizayn | Figma `figma.com/design/VfrwfbjWNNyA5BombIor7z/Chaman` — Home frame `240:247`, Admin sahifasi `268:4567` |

**Vercel environment variables** (Production + Preview `backend`):

| Key | Qiymat / manba |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (+ boshqa `DATABASE_*`) | Neon integratsiyasi avtomatik qoʻygan (prefix `DATABASE`) |
| `ADMIN_PASSWORD` | Ibrohim qoʻygan oddiy demo parol — **real ishga tushirishdan oldin almashtirish** |
| `SMS_PROVIDER` | `demo` (kod ekranda chiqadi). Real ishda `eskiz` |
| `OTP_PEPPER` | hali qoʻyilmagan — `eskiz` yoqilganda **majburiy** |

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
- Pul — butun soʻm (`bigint`). Zadatok = narxning 30%i, 1000 ga yaxlitlanadi.
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
- Studiya tomoni hali yoʻq — **hozircha studiya oʻrniga admin tasdiqlaydi**.

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
6. Yangi ish → alohida branch'da, tekshirilgach `main`ga. **`main`ga push = jonli saytga chiqadi.**
7. Jonli tekshiruv: `curl https://datelle-web.vercel.app/api/health` → `{"db":"up"}`; deploy holati: `gh api repos/ibrohimabrolov/datelle-web/commits/<sha>/statuses`.
8. Sxema oʻzgarsa: `schema.ts` → `npm run db:generate` → yangi `drizzle/*.sql` commit qilinadi; Vercel build uni avtomatik qoʻllaydi.

**Muhit tuzoqlari:**
- `pkill -f next` shell'ning oʻzini oʻldiradi — PID boʻyicha oʻldirish.
- Konteyner qayta ishga tushsa Postgres oʻchib qoladi — `pg_ctlcluster 16 main start`.
- Seed'ni prod'da qoʻlda yugurtirmang: u studiya maʼlumotlarini qayta yozadi (predeploy faqat boʻsh bazada seed qiladi).

---

## 10. Qabul qilingan qarorlar

- Framer emas — **kod** (Next.js), Figma bilan 1:1.
- Hosting hozircha **Vercel**, baza **Neon** — faqat demo/test maʼlumot uchun.
- Login — telefon + SMS kod (parolsiz). Admin — oddiy parol (v1 soddalik uchun).
- Studiya tomoni qurilguncha soʻrovlarni admin boshqaradi.
- Mock bandlik olib tashlangan; hamma raqamlar bazadan.

---

## 11. Ochiq masalalar va keyingi qadamlar (ustuvorlik tartibida)

1. **Home illyustratsiyalari** — Hero floating kartalar, Signature, HowItWorks hali statik "12-iyun · 34" koʻrsatadi → haqiqiy sanaga almashtirish.
2. **Studiya tomoni** — Telegram bot (yangi soʻrov xabari, Tasdiqlash/Rad tugmalari, kun yopish) + oddiy studiya paneli. Admin qoʻlda ishlashini olib tashlaydi.
3. **Toʻlov** — Payme / Click merchant, `confirmed → paid` zadatok oqimi (hozir admin qoʻlda "Zadatok olindi" bosadi).
4. **SMS** — Eskiz (yoki Play Mobile) shartnomasi, sender nomi, shablon tasdiqlash; `SMS_PROVIDER=eskiz`, `OTP_PEPPER` qoʻyish. `src/server/sms.ts` endpointlarini Eskiz hujjatlari bilan tekshirish.
5. **Maʼlumotlar joylashuvi** — Oʻzbekiston qonuni: fuqarolar shaxsiy maʼlumotlari Oʻzbekistondagi serverda. Real foydalanuvchilardan **oldin** bazani (ideal holda ilovani ham) mahalliy provayderga koʻchirish.
6. **Foto yuklash** — taklif brief'i va studiya galereyasi uchun S3-mos storage (Oʻzbekistonda).
7. **Admin** — umumiy parol oʻrniga shaxsiy admin akkauntlari (`role=admin` + OTP) va "kim nima qildi" auditi.
8. **Brend va domen** — yakuniy nom (Datelle) va `datelle.uz`, Instagram/Telegram akkauntlari; Vercel'ga domen ulash.
9. Vercel **Hobby** tarifi tijoriy foydalanish uchun emas — pul ishlay boshlaganda Pro'ga yoki boshqa hostingga oʻtish.

---

## 12. Ibrohim bilan ishlash

- Senior product/UI dizayner; **kod, deploy, GitHub, server boʻyicha kuchli emas** — texnik qadamlarni oddiy tilda, "qayerni bosish" darajasida tushuntirish (Vercel/Neon ekranlarini skrinshot qilib yuboradi).
- Javob: **oʻzbekcha**, dizayn/texnik atamalar inglizcha. Qisqa, aniq, fikr bilan; zaif yoʻnalishda eʼtiroz bildirish. Roʻyxat-variantlar faqat soʻralganda.
- Dizayn standarti: minimal, yuqori kontrast, 8pt ritm, semantik tokenlar, WCAG AA; aniq qiymatlar (px, hex, weight).
- Sir (parol, kalit) chatga yozilmaydi — Vercel env'ga oʻzi qoʻyadi.
