# Datelle Studio — design → code handoff

> v1.0 · 2026-11-12 · Figma: `figma.com/design/XNmqL3kbnh0lPpzO6ZQKUR` (Projects team)
> Product: `claude/Datelle-MVP-SCOPE.md` · Tech: `claude/Datelle-STUDIO-TECH.md` (Project docs) · Tokens: `src/studio/tokens.css`

## 1. Figma file map

| Page | What | Use in code |
|---|---|---|
| 🖼️ Cover | Product shot | — |
| 📝 UX audit | Audit tables (mobile) | Acceptance criteria |
| 🎨 Foundations | Variables, text/effect styles | `src/studio/tokens.css` (generated) |
| 🧩 Components | 35 components / sets | Section 3 below |
| 💠 Icons | 846 sets × 6 styles | Use **Filled**; chevrons, search, inactive nav → **Line** |
| 📱 Mobile · Mini App | 49 screens, 5 prototype flows | `< 1024px` layout |
| 🖥 Desktop · Web | 37 screens, 5 prototype flows | `≥ 1024px` layout |

Prototype flows (Present → flow list): Mobile — Onboarding → Kalendar · Kalendar → yangi buyurtma · Buyurtma va toʻlov · Dashboard · Sozlamalar. Desktop — Kirish → Dashboard · Kalendar · Buyurtma va toʻlov · Forma validatsiyasi · Sozlamalar.

## 2. Foundations (all values live in `tokens.css`, scoped to `.studio`)

- **Color:** 122 semantic tokens, Light + Dark, aliasing primitives. Never hardcode hex in components; use `var(--ds-*)`.
  - Solid fills (Primary, Destructive, Booked day) use `--ds-state-hover-solid` / `--ds-state-pressed-solid` overlays — they always darken, so on-color text stays ≥ 4.5:1 in Dark.
  - Inside Telegram (`data-platform="telegram"`) surfaces, text, hint, link and destructive follow `--tg-theme-*`; brand, money, day and event colors stay ours.
- **Spacing:** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96. `4` only for inline gaps.
- **Radius:** sm 8 · md 12 · lg 16 · ring-lg 20 · xl 24 · 2xl 28 · full.
- **Type (Inter):** Display/Hero 48/56 · Display/Numeral 56/56 · H1 Desktop 32/40 · H1 28/36 · H2 20/28 · H3 17/24 · Body 15/22 (400/500/600) · Label 13/18 (500/600) · Label/Caps 12/16 +6% · Number/Money 17/24 · Number/KPI 32/40. Min text size 12px.
- **Numbers:** money and tables use `.ds-tabular` (`font-variant-numeric: tabular-nums`) — Figma can't express it, code must. Format `12 500 000 soʻm` (thin grouping with a regular space).
- **Focus:** `:focus-visible` → `box-shadow: var(--ds-focus-ring)` (2px gap + 2px `border/focus`). Contrast vs any adjacent surface ≥ 7:1.
- **Motion (from prototype):** page change = dissolve 200ms ease-out; in-page state / panel / sheet = 300ms ease-out; mobile push = slide from right 300ms; tab switch = dissolve 150ms. Respect `prefers-reduced-motion`.
- **Layout:** Mobile 390 (16 gutter, content 358) · Desktop sidebar 240 + main, content max 1120 (40 gutter), side panel 480, confirm dialog 420, form modal 480.

## 3. Components → React

`components/studio/*` (new). Variants become props; states map to CSS pseudo-classes + `data-state`.

| Figma | React | Props / variants | States |
|---|---|---|---|
| Button | `Button` | `variant: primary\|secondary\|ghost\|destructive`, `size: m(44)\|l(52)`, `icon` | hover, focus, pressed, disabled, loading |
| IconButton | `IconButton` | `variant: brand(56)\|secondary(44)\|ghost(44)`, `icon`, required `aria-label` | hover, focus, pressed, disabled |
| Chip | `Chip` | `selected`, `count?` | hover, focus, pressed |
| Segment (+ track) | `SegmentedControl` | `items[{label,count?}]`, `value` | hover, focus, pressed; role=radiogroup |
| Input | `TextField` | `label` (always visible), `suffix?`, `helper?`, `error?` | empty, filled, focus, error (`aria-invalid`, `aria-describedby`), disabled |
| SearchField | `SearchField` | `value`, `onClear` | empty, filled, focus |
| Toggle | `Switch` | `checked` | focus, disabled; role=switch |
| Selection | `Checkbox` / `Radio` | `checked` | focus, disabled; 24px hit area |
| StatusPill | `StatusPill` | `status: active\|done\|cancelled\|due` | — |
| DayCell (mobile) | `DayCell` | `state: free\|hasOrders\|limited\|booked\|blocked\|today\|outside\|selected` | — |
| DayCell Large | `DayCellLarge` | `state` + `interaction: default\|hover\|focus\|selected`, `chips[]`, `capacityLabel` ("1 joy") | today = filled number disc; selected = 2px outer ring |
| KpiCard | `KpiCard` | `tone: inverse\|due\|default`, `delta?` | — |
| OrderCard | `OrderCard` | `due: no\|yes\|overdue`, event type → date tile color | — |
| DataTable/Head + Row | `DataTable` | columns, sort (`aria-sort`), selectable rows, sticky head | row: hover, focus, selected, loading |
| PanelHeader | `PanelHeader` | `title`, `onBack?`, `onMore?`, `onClose` | order: Back → Title → ⋯ → X |
| PaymentRow | `PaymentRow` | `title`, `meta`, `amount`, `actions?` (owner only) | — |
| ConfirmDialog | `ConfirmDialog` | `tone: destructive\|primary`, `title`, `description`, `safeLabel`, `actionLabel` | role=alertdialog; focus starts on safe action |
| Toast | `Toast` | `label`, `action?` (undo) | 6s, pauses on hover/focus |
| Alert | `Alert` | `type: info\|success\|warning\|danger`, `title`, `description?` | — |
| NavItem / Sidebar | `Sidebar` | `active`, `role: owner\|manager` (manager: no Dashboard), badge count | hover, focus |
| TabBar (mobile) | `TabBar` | `active`, `role` | — |
| Tab bar (Telegram) | — | Use native `MainButton` / `SecondaryButton` | — |
| Telegram/Header | — | Native header; `BackButton` on pushed screens, Close on roots | — |
| SheetHeader, Dialog (mobile) | `BottomSheet`, `Dialog` | — | — |

## 4. Screens → routes (`src/app/panel/*`, one responsive layout)

| Route | Mobile screen(s) | Desktop screen(s) | Roles |
|---|---|---|---|
| `/panel/kirish` | — (auto via initData) | S1 · Kirish, · xato, · ruxsat yoʻq | all |
| `/panel/onboarding` | S1 · Onboarding | (Mini App only) | new user |
| `/panel` | → Dashboard (owner) / Kalendar (manager) | same | — |
| `/panel/dashboard` | S2 · Dashboard (+ boʻsh, yuklanmoqda) | S2 · Dashboard (+ boʻsh, yuklanmoqda, xato) | owner |
| `/panel/kalendar` | S3 · Kalendar, Kun tanlandi (sheet), Kunni yopish | S3 · Kalendar, + panel, Kunni yopish, Kun yopildi | all |
| `/panel/buyurtmalar` | S4 · Buyurtmalar (+ qidiruv, topilmadi, qoldiq yoʻq) | S4 · Buyurtmalar (+ tanlangan, topilmadi, qoldiq yoʻq, yuklanmoqda, xato) | all |
| `/panel/buyurtmalar/[id]` | S5 · Buyurtma (+ toʻlov, amallar, tarix, bekor) | S5 · Buyurtma (panel) (+ Toʻlov modal, Tarix, Bekor dialog) | all (delete payment: owner) |
| `/panel/buyurtmalar/yangi` | S5 · Yangi buyurtma (+ xato, saqlanmoqda) | Yangi buyurtma (panel) (+ xato, saqlanmoqda, chiqish) | all |
| `/panel/sozlamalar` | S6 · Sozlamalar (+ menejer qoʻshish, aʼzoni chiqarish) | S6 · Sozlamalar (+ menejer) | owner full / manager: Eslatmalar + Hisob |

On desktop, order detail and forms open as a 480px side panel over the list/calendar (URL still changes, so deep links work); on mobile they are full pages with Telegram BackButton.

## 5. State matrix (must exist in code)

Every data view: **loading** (skeleton, same layout) · **empty** (with CTA) · **error** (Alert or card + "Qayta urinish") · **success** (toast; reversible writes get "Bekor qilish"). Forms: inline validation on submit, `Saqlash` → loading, unsaved-changes confirm on close. Destructive: confirm dialog (cancel order, remove member) or undo (payment added, day closed). Payment rows are never hard-deleted (soft delete, owner only).

## 6. Accessibility checklist (from desktop + mobile audits)

- Text ≥ 4.5:1, UI ≥ 3:1 in Light **and** Dark (values verified in Figma audit).
- Focus visible on every interactive element; panels/modals trap focus, Esc closes, focus returns to trigger.
- Targets: mobile ≥ 44px; desktop ≥ 24px (primary actions ≥ 40px).
- Meaning never by color only: "1 joy" label, lock + "Yopiq", "Kechikdi"/"Qoldiq" captions.
- Inputs: persistent label; error text linked with `aria-describedby`.
