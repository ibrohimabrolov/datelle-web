import type { StaticImageData } from "next/image";

import gulnoza from "@/assets/img/vendor-gulnoza.jpg";
import oqsaroy from "@/assets/img/vendor-oqsaroy.jpg";
import lola from "@/assets/img/vendor-lola.jpg";
import navroz from "@/assets/img/vendor-navroz.jpg";
import zarafshon from "@/assets/img/vendor-zarafshon.jpg";
import bahor from "@/assets/img/vendor-bahor.jpg";
import evToy from "@/assets/img/event-toy.jpg";
import evQiz from "@/assets/img/event-qiz-uzatar.jpg";
import evTk from "@/assets/img/event-tugilgan-kun.jpg";
import evYub from "@/assets/img/event-yubiley.jpg";
import evKorp from "@/assets/img/event-korporativ.jpg";
import florist from "@/assets/img/florist.jpg";
import hero from "@/assets/img/hero.jpg";

/* ─────────────────────────────────────────────────────────────
   Mock catalog. Deterministic — every page (home, katalog, studiya)
   reads availability from the same functions, so counts always agree.
   Replace with API calls when the backend exists.
   ───────────────────────────────────────────────────────────── */

export type Category = "dekor" | "floristika";
export type Status = "free" | "few" | "busy";

export const MONTH = { name: "Iyun", year: 2026, days: 30, firstWeekday: 0 } as const; // 1-iyun 2026 — dushanba
export const WD_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] as const;
export const WD_FULL = ["dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba"] as const;
export const weekdayIdx = (d: number) => (MONTH.firstWeekday + d - 1) % 7;
export const dayLabel = (d: number) => `${d}-iyun, ${WD_FULL[weekdayIdx(d)]}`;
export const dayShort = (d: number) => `${d}-iyun`;
export const DEFAULT_DAY = 12;

export const EVENT_TYPES = [
  { slug: "toy", label: "Toʻy" },
  { slug: "qiz-uzatar", label: "Qiz uzatar" },
  { slug: "tugilgan-kun", label: "Tugʻilgan kun" },
  { slug: "yubiley", label: "Yubiley" },
  { slug: "korporativ", label: "Korporativ" },
  { slug: "beshik-toy", label: "Beshik toʻy" },
] as const;
export type EventSlug = (typeof EVENT_TYPES)[number]["slug"];
export const eventLabel = (s: string) => EVENT_TYPES.find((e) => e.slug === s)?.label ?? "Istalgan";

export const DISTRICTS = [
  "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulugʻbek", "Olmazor", "Sergeli",
  "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yangihayot", "Yashnobod", "Yunusobod",
] as const;
export const districtSlug = (d: string) =>
  d.toLowerCase().replace(/[ʻʼ'’]/g, "").replace(/\s+/g, "-");
export const districtBySlug = (s: string) => DISTRICTS.find((d) => districtSlug(d) === s);

export const BUDGETS = [
  { value: 0, label: "Istalgan" },
  { value: 2_000_000, label: "2 mln gacha" },
  { value: 3_000_000, label: "3 mln gacha" },
  { value: 5_000_000, label: "5 mln gacha" },
  { value: 10_000_000, label: "10 mln gacha" },
] as const;
export const budgetLabel = (v: number) => BUDGETS.find((b) => b.value === v)?.label ?? "Istalgan";

export const SORTS = [
  { value: "tavsiya", label: "Tavsiya etilgan" },
  { value: "arzon", label: "Avval arzonroq" },
  { value: "qimmat", label: "Avval qimmatroq" },
  { value: "reyting", label: "Reyting boʻyicha" },
] as const;
export type SortValue = (typeof SORTS)[number]["value"];

export const CHIPS = [
  { value: "tekshirilgan", label: "Tekshirilgan" },
  { value: "reyting", label: "Reyting 4.5+" },
  { value: "tez", label: "Javob ≤ 2 soat" },
] as const;
export type ChipValue = (typeof CHIPS)[number]["value"];

export type Package = { id: string; title: string; includes: string; price: number };

export type Vendor = {
  slug: string;
  name: string;
  category: Category;
  district: (typeof DISTRICTS)[number];
  rating: number;
  reviews: number;
  priceFrom: number;
  responseHours: number;
  verified: boolean;
  completed: number;
  events: EventSlug[];
  img: StaticImageData;
  gallery: StaticImageData[];
  rank: number;
  about: string;
  packages: Package[];
  featured?: { busy: number[]; few: number[] };
};

/* ── deterministic hash ── */
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const POOL = [gulnoza, oqsaroy, lola, navroz, zarafshon, bahor, evToy, evQiz, evYub, evKorp, evTk, hero];
const FLORIST_POOL = [florist, evYub, evQiz, lola, evToy, gulnoza];
const ALL_EVENTS = EVENT_TYPES.map((e) => e.slug);

function galleryFor(cover: StaticImageData, seed: string, pool = POOL) {
  const rest = pool.filter((p) => p !== cover);
  const start = hash(seed) % rest.length;
  return [cover, ...rest.slice(start), ...rest.slice(0, start)].slice(0, 8);
}

function decorPackages(slug: string, from: number): Package[] {
  const round = (n: number) => Math.round(n / 100_000) * 100_000;
  return [
    { id: "standart", title: "Toʻy dasturxoni bezagi — Standart", includes: "Sahna · Kelin-kuyov stoli · Fon · Jonli gul", price: from },
    { id: "toliq", title: "Toʻy zali — Toʻliq dekor", includes: "Sahna · 30 ta stol · Kirish arkasi · Yorugʻlik", price: round(from * 2.83) },
    { id: "fotozona", title: "Fotozona", includes: "Fon · Gul devori · Aksessuarlar", price: Math.max(600_000, round(from / 3)) },
  ].map((p) => ({ ...p, id: `${slug}-${p.id}` }));
}
function floristPackages(slug: string, from: number): Package[] {
  const round = (n: number) => Math.round(n / 100_000) * 100_000;
  return [
    { id: "zal", title: "Zal gul bezagi", includes: "Sahna kompozitsiyasi · Stol gullari · Kirish", price: from },
    { id: "stol", title: "Stol kompozitsiyalari — 20 ta", includes: "Jonli gul · Shamdonlar · Yetkazib berish", price: round(from * 0.6) },
    { id: "guldasta", title: "Kelin guldastasi", includes: "Mavsumiy gullar · Lenta · Butonyerka", price: Math.max(500_000, round(from / 4)) },
  ].map((p) => ({ ...p, id: `${slug}-${p.id}` }));
}

const DECOR_ABOUT = [
  "Toʻy, qiz uzatar va yubileylar uchun jonli gul va zamonaviy dekor. Har bir loyiha zal oʻlchami va mehmonlar soniga qarab tuziladi. Montaj va demontaj narxga kiritilgan.",
  "Klassik va zamonaviy uslubdagi zal bezagi. Eskizni oldindan koʻrsatamiz, tadbir kuni montajni 4 soatda tugatamiz.",
  "Kichik va oʻrta zallar uchun ixcham dekor. Oq-yashil palitra va jonli gullar — bizning asosiy yoʻnalish.",
];
const FLORIST_ABOUT = [
  "Mavsumiy jonli gullardan kompozitsiyalar, kelin guldastasi va zal bezagi. Gullarni tadbir kuni ertalab yigʻamiz.",
  "Gollandiya va mahalliy gullar bilan ishlaymiz. Guldasta va stol kompozitsiyalari bir uslubda tayyorlanadi.",
];

/* ── featured vendors (Figma names, in "Tavsiya etilgan" order) ── */
type Seed = Pick<Vendor, "slug" | "name" | "district" | "rating" | "reviews" | "priceFrom" | "img"> & {
  responseHours?: number; completed?: number; busy?: number[]; few?: number[];
};
const WEEKEND_BUSY = [6, 7, 20, 21, 27, 28];
const FEATURED_SEEDS: Seed[] = [
  { slug: "gulnoza-decor", name: "Gulnoza Decor", district: "Yunusobod", rating: 4.9, reviews: 38, priceFrom: 3_000_000, img: gulnoza, responseHours: 1, completed: 112, busy: [6, 7, 13, 20, 21, 27], few: [14, 28] },
  { slug: "oq-saroy-event", name: "Oq Saroy Event", district: "Mirzo Ulugʻbek", rating: 5.0, reviews: 21, priceFrom: 6_500_000, img: oqsaroy },
  { slug: "lola-studio", name: "Lola Studio", district: "Yakkasaroy", rating: 4.7, reviews: 64, priceFrom: 2_500_000, img: lola },
  { slug: "navroz-dekor", name: "Navroʻz Dekor", district: "Sergeli", rating: 4.6, reviews: 33, priceFrom: 1_800_000, img: navroz },
  { slug: "bahor-studio", name: "Bahor Studio", district: "Chilonzor", rating: 4.8, reviews: 52, priceFrom: 2_200_000, img: bahor },
  { slug: "zarafshon-decor", name: "Zarafshon Decor", district: "Olmazor", rating: 4.9, reviews: 45, priceFrom: 4_000_000, img: zarafshon },
  { slug: "sumbula-event", name: "Sumbula Event", district: "Mirobod", rating: 4.5, reviews: 12, priceFrom: 3_500_000, img: gulnoza },
  { slug: "oydin-decor", name: "Oydin Decor", district: "Uchtepa", rating: 4.8, reviews: 27, priceFrom: 1_500_000, img: oqsaroy },
  { slug: "ipak-yoli-event", name: "Ipak Yoʻli Event", district: "Shayxontohur", rating: 4.7, reviews: 19, priceFrom: 4_800_000, img: lola },
  { slug: "lazurit-studio", name: "Lazurit Studio", district: "Yashnobod", rating: 4.6, reviews: 41, priceFrom: 2_900_000, img: navroz },
];
// Figma states: 12-iyun hamma boʻsh (Navroʻz, Oydin — 1 joy); 13-iyun 4 ta; 14-iyun 3 ta.
const FREE_13 = ["lola-studio", "navroz-dekor", "bahor-studio", "oydin-decor"];
const FREE_14 = ["gulnoza-decor", "zarafshon-decor", "lazurit-studio"];
const FEW_12 = ["navroz-dekor", "oydin-decor"];

function featuredCalendar(s: Seed) {
  if (s.busy) return { busy: s.busy, few: s.few ?? [] };
  const busy = WEEKEND_BUSY.filter((d) => hash(s.slug + d) % 2 === 0);
  if (!FREE_13.includes(s.slug)) busy.push(13);
  if (!FREE_14.includes(s.slug)) busy.push(14);
  const few = FEW_12.includes(s.slug) ? [12] : [];
  return { busy, few };
}

const FIRST = ["Afrosiyob", "Bonu", "Charos", "Dilnur", "Feruza", "Gulsara", "Hilola", "Iroda", "Jasmin", "Kamola", "Laylo", "Malika", "Nigora", "Orzu", "Parizod", "Qumri", "Rayhon", "Sabo", "Shirin", "Umida", "Chinor", "Xumor", "Yulduz", "Zilola", "Marjon", "Nafosat", "Sevara", "Tillo", "Zumrad", "Durdona", "Gavhar", "Munisa", "Nodira", "Safiya", "Ziyoda", "Barno", "Lazzat", "Oqtosh", "Mehr", "Anor"];
const SUFFIX = ["Decor", "Event", "Studio", "Dekor", "Design"];
const FLORISTS = ["Gulshan Flowers", "Rayhona Florist", "Lavanda Gul", "Nilufar Flowers", "Bonu Florist", "Sadaf Gul Studio", "Atirgul Florist", "Moviy Gul", "Lolazor Flowers", "Sumbul Florist", "Gulnor Studio", "Bahorgul Flowers"];

const slugify = (s: string) => s.toLowerCase().replace(/[ʻʼ'’]/g, "").replace(/\s+/g, "-");

function build(): Vendor[] {
  const list: Vendor[] = [];
  FEATURED_SEEDS.forEach((s, i) => {
    const h = hash(s.slug);
    list.push({
      ...s,
      category: "dekor",
      responseHours: s.responseHours ?? 1 + (h % 2),
      verified: true,
      completed: s.completed ?? 40 + (h % 90),
      events: ALL_EVENTS,
      gallery: galleryFor(s.img, s.slug),
      rank: i + 1,
      about: DECOR_ABOUT[h % DECOR_ABOUT.length],
      packages: decorPackages(s.slug, s.priceFrom),
      featured: featuredCalendar(s),
    });
  });
  FIRST.forEach((f, i) => {
    const name = `${f} ${SUFFIX[i % SUFFIX.length]}`;
    const slug = slugify(name);
    const h = hash(slug);
    const priceFrom = 1_500_000 + (h % 35) * 100_000;
    const img = POOL[h % POOL.length];
    list.push({
      slug, name, category: "dekor",
      district: DISTRICTS[h % DISTRICTS.length],
      rating: Math.round((4.5 + (h % 6) / 10) * 10) / 10,
      reviews: 8 + (h % 60),
      priceFrom,
      responseHours: 1 + (h % 2),
      verified: true,
      completed: 15 + (h % 120),
      events: ALL_EVENTS.filter((e, j) => e === "toy" || (h >> j) % 3 !== 0),
      img, gallery: galleryFor(img, slug),
      rank: 20 + (h % 1000),
      about: DECOR_ABOUT[h % DECOR_ABOUT.length],
      packages: decorPackages(slug, priceFrom),
    });
  });
  FLORISTS.forEach((name) => {
    const slug = slugify(name);
    const h = hash(slug);
    const priceFrom = 1_200_000 + (h % 30) * 100_000;
    const img = FLORIST_POOL[h % FLORIST_POOL.length];
    list.push({
      slug, name, category: "floristika",
      district: DISTRICTS[h % DISTRICTS.length],
      rating: Math.round((4.5 + (h % 6) / 10) * 10) / 10,
      reviews: 6 + (h % 40),
      priceFrom,
      responseHours: 1 + (h % 3),
      verified: true,
      completed: 10 + (h % 80),
      events: ALL_EVENTS.filter((e) => e !== "korporativ" || h % 2 === 0) as EventSlug[],
      img, gallery: galleryFor(img, slug, FLORIST_POOL),
      rank: 20 + (h % 1000),
      about: FLORIST_ABOUT[h % FLORIST_ABOUT.length],
      packages: floristPackages(slug, priceFrom),
    });
  });
  return list.sort((a, b) => a.rank - b.rank);
}

export const VENDORS: Vendor[] = build();
export const vendorBySlug = (slug: string) => VENDORS.find((v) => v.slug === slug);

/* ── availability ── */
// Figma: dekor boʻsh studiyalar soni 8–17-iyun
const DEKOR_TARGET: Record<number, number> = { 8: 41, 9: 38, 10: 36, 11: 35, 12: 34, 13: 6, 14: 4, 15: 44, 16: 47, 17: 45 };
function target(cat: Category, d: number) {
  const weekend = weekdayIdx(d) >= 5;
  const h = hash(`${cat}-${d}`);
  if (cat === "dekor") return DEKOR_TARGET[d] ?? (weekend ? 6 + (h % 8) : 28 + (h % 16));
  return weekend ? 2 + (h % 3) : 6 + (h % 4);
}

const statusCache = new Map<string, Status>();
function computeDay(cat: Category, d: number) {
  const ofCat = VENDORS.filter((v) => v.category === cat);
  const fixed = ofCat.filter((v) => v.featured);
  const rest = ofCat.filter((v) => !v.featured);
  let freeFixed = 0;
  for (const v of fixed) {
    const s: Status = v.featured!.busy.includes(d) ? "busy" : v.featured!.few.includes(d) ? "few" : "free";
    if (s !== "busy") freeFixed++;
    statusCache.set(`${v.slug}:${d}`, s);
  }
  const need = Math.max(0, target(cat, d) - freeFixed);
  [...rest]
    .sort((a, b) => hash(a.slug + d) - hash(b.slug + d))
    .forEach((v, i) => {
      const s: Status = i < need ? (hash(v.slug + "few" + d) % 9 === 0 ? "few" : "free") : "busy";
      statusCache.set(`${v.slug}:${d}`, s);
    });
}

export function statusOf(v: Vendor, d: number): Status {
  if (d < 1 || d > MONTH.days) return "busy";
  const key = `${v.slug}:${d}`;
  if (!statusCache.has(key)) computeDay(v.category, d);
  return statusCache.get(key)!;
}
export const isFree = (v: Vendor, d: number) => statusOf(v, d) !== "busy";

/* ── filtering ── */
export type Filters = {
  sana: number;
  tadbir: EventSlug | "all";
  tuman: string; // district slug | "all"
  byudjet: number; // 0 = istalgan
  tur: Category;
  chips: ChipValue[];
  saralash: SortValue;
};

export const DEFAULT_FILTERS: Filters = {
  sana: DEFAULT_DAY,
  tadbir: "toy",
  tuman: "all",
  byudjet: 5_000_000,
  tur: "dekor",
  chips: ["tekshirilgan", "reyting", "tez"],
  saralash: "tavsiya",
};

export function matches(v: Vendor, f: Filters, day = f.sana) {
  if (v.category !== f.tur) return false;
  if (!isFree(v, day)) return false;
  if (f.tadbir !== "all" && !v.events.includes(f.tadbir)) return false;
  if (f.tuman !== "all" && districtSlug(v.district) !== f.tuman) return false;
  if (f.byudjet && v.priceFrom > f.byudjet) return false;
  if (f.chips.includes("tekshirilgan") && !v.verified) return false;
  if (f.chips.includes("reyting") && v.rating < 4.5) return false;
  if (f.chips.includes("tez") && v.responseHours > 2) return false;
  return true;
}

export function search(f: Filters) {
  const res = VENDORS.filter((v) => matches(v, f));
  const by: Record<SortValue, (a: Vendor, b: Vendor) => number> = {
    tavsiya: (a, b) => a.rank - b.rank,
    arzon: (a, b) => a.priceFrom - b.priceFrom,
    qimmat: (a, b) => b.priceFrom - a.priceFrom,
    reyting: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  };
  return res.sort(by[f.saralash]);
}

export const countFor = (f: Filters, day: number) => VENDORS.filter((v) => matches(v, f, day)).length;
export const freeCount = (cat: Category, d: number) =>
  VENDORS.filter((v) => v.category === cat && isFree(v, d)).length;

/* ── URL <-> filters ── */
type SP = { get(name: string): string | null };
export function parseFilters(sp: SP): Filters {
  const n = Number(sp.get("sana"));
  const t = sp.get("tadbir");
  const tm = sp.get("tuman");
  const b = sp.get("byudjet");
  const tur = sp.get("tur");
  const f = sp.get("f");
  const s = sp.get("saralash");
  return {
    sana: n >= 1 && n <= MONTH.days ? n : DEFAULT_FILTERS.sana,
    tadbir: t === "all" ? "all" : (EVENT_TYPES.find((e) => e.slug === t)?.slug ?? DEFAULT_FILTERS.tadbir),
    tuman: tm && (tm === "all" || districtBySlug(tm)) ? tm : DEFAULT_FILTERS.tuman,
    byudjet: b !== null && BUDGETS.some((x) => String(x.value) === b) ? Number(b) : DEFAULT_FILTERS.byudjet,
    tur: tur === "floristika" ? "floristika" : "dekor",
    chips: f === null ? DEFAULT_FILTERS.chips : (f.split(",").filter((c) => CHIPS.some((x) => x.value === c)) as ChipValue[]),
    saralash: (SORTS.find((x) => x.value === s)?.value ?? "tavsiya") as SortValue,
  };
}

export function toQuery(f: Partial<Filters>) {
  const q = new URLSearchParams();
  if (f.tur && f.tur !== "dekor") q.set("tur", f.tur);
  if (f.sana !== undefined) q.set("sana", String(f.sana));
  if (f.tadbir !== undefined) q.set("tadbir", f.tadbir);
  if (f.tuman !== undefined) q.set("tuman", f.tuman);
  if (f.byudjet !== undefined) q.set("byudjet", String(f.byudjet));
  if (f.chips !== undefined) q.set("f", f.chips.join(","));
  if (f.saralash && f.saralash !== "tavsiya") q.set("saralash", f.saralash);
  return q.toString();
}

/* Link into the catalogue showing exactly what home counted (no extra filters) */
export const catalogHref = (p: Partial<Filters> = {}) =>
  `/studiyalar?${toQuery({ tadbir: "all", byudjet: 0, chips: [], ...p })}`;

export const fmtSum = (n: number) => n.toLocaleString("ru-RU").replace(/[  ,]/g, " ") + " soʻm";
export const fmtMln = (n: number) => `${(n / 1_000_000).toLocaleString("ru-RU").replace(",", ".")} mln`;

export const dayInfo = (cat: Category, d: number) => {
  const free = freeCount(cat, d);
  return { wd: WD_SHORT[weekdayIdx(d)] as string, d, free, few: free < 10 };
};
