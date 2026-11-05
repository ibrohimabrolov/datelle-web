
/* ─────────────────────────────────────────────────────────────
   Catalogue reference data: labels, filters and vendor profiles.
   Vendor profiles are also the DB seed (src/server/seed.ts).
   Availability is NOT here — it lives in Postgres (vendor_days)
   and reaches the UI through /api/*.
   ───────────────────────────────────────────────────────────── */

import { defaultDate, isISODate, isBookable, todayISO } from "@/lib/dates";
export { dayLabel, dayShort } from "@/lib/dates";

export type Category = "dekor" | "floristika";
export type Status = "free" | "few" | "busy";

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
  img: string; // image key — resolve with imageFor() from "@/data/images"
  gallery: string[];
  rank: number;
  about: string;
  packages: Package[];
  imageKey: string;
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

const POOL = ["vendor-gulnoza", "vendor-oqsaroy", "vendor-lola", "vendor-navroz", "vendor-zarafshon", "vendor-bahor", "event-toy", "event-qiz-uzatar", "event-yubiley", "event-korporativ", "event-tugilgan-kun", "hero"];
const FLORIST_POOL = ["florist", "event-yubiley", "event-qiz-uzatar", "vendor-lola", "event-toy", "vendor-gulnoza"];
const ALL_EVENTS = EVENT_TYPES.map((e) => e.slug);

function galleryFor(cover: string, seed: string, pool = POOL) {
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
  responseHours?: number; completed?: number;
};
const FEATURED_SEEDS: Seed[] = [
  { slug: "gulnoza-decor", name: "Gulnoza Decor", district: "Yunusobod", rating: 4.9, reviews: 38, priceFrom: 3_000_000, img: "vendor-gulnoza", responseHours: 1, completed: 112 },
  { slug: "oq-saroy-event", name: "Oq Saroy Event", district: "Mirzo Ulugʻbek", rating: 5.0, reviews: 21, priceFrom: 6_500_000, img: "vendor-oqsaroy" },
  { slug: "lola-studio", name: "Lola Studio", district: "Yakkasaroy", rating: 4.7, reviews: 64, priceFrom: 2_500_000, img: "vendor-lola" },
  { slug: "navroz-dekor", name: "Navroʻz Dekor", district: "Sergeli", rating: 4.6, reviews: 33, priceFrom: 1_800_000, img: "vendor-navroz" },
  { slug: "bahor-studio", name: "Bahor Studio", district: "Chilonzor", rating: 4.8, reviews: 52, priceFrom: 2_200_000, img: "vendor-bahor" },
  { slug: "zarafshon-decor", name: "Zarafshon Decor", district: "Olmazor", rating: 4.9, reviews: 45, priceFrom: 4_000_000, img: "vendor-zarafshon" },
  { slug: "sumbula-event", name: "Sumbula Event", district: "Mirobod", rating: 4.5, reviews: 12, priceFrom: 3_500_000, img: "vendor-gulnoza" },
  { slug: "oydin-decor", name: "Oydin Decor", district: "Uchtepa", rating: 4.8, reviews: 27, priceFrom: 1_500_000, img: "vendor-oqsaroy" },
  { slug: "ipak-yoli-event", name: "Ipak Yoʻli Event", district: "Shayxontohur", rating: 4.7, reviews: 19, priceFrom: 4_800_000, img: "vendor-lola" },
  { slug: "lazurit-studio", name: "Lazurit Studio", district: "Yashnobod", rating: 4.6, reviews: 41, priceFrom: 2_900_000, img: "vendor-navroz" },
];
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
      imageKey: s.img,
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
      imageKey: img,
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
      imageKey: img,
    });
  });
  return list.sort((a, b) => a.rank - b.rank);
}

export const VENDORS: Vendor[] = build();
export const vendorBySlug = (slug: string) => VENDORS.find((v) => v.slug === slug);

/* ── filtering ── */
export type Filters = {
  sana: string; // ISO date
  tadbir: EventSlug | "all";
  tuman: string; // district slug | "all"
  byudjet: number; // 0 = istalgan
  tur: Category;
  chips: ChipValue[];
  saralash: SortValue;
};

export const DEFAULT_FILTERS: Omit<Filters, "sana"> = {
  tadbir: "toy",
  tuman: "all",
  byudjet: 5_000_000,
  tur: "dekor",
  chips: ["tekshirilgan", "reyting", "tez"],
  saralash: "tavsiya",
};

/* ── URL <-> filters ── */
type SP = { get(name: string): string | null };
export function parseFilters(sp: SP, today = todayISO()): Filters {
  const n = sp.get("sana");
  const t = sp.get("tadbir");
  const tm = sp.get("tuman");
  const b = sp.get("byudjet");
  const tur = sp.get("tur");
  const f = sp.get("f");
  const s = sp.get("saralash");
  return {
    sana: isISODate(n) && isBookable(n, today) ? n : defaultDate(today),
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
  if (f.sana !== undefined) q.set("sana", f.sana);
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

/* What /api/vendors/search returns per vendor */
export type VendorHit = {
  slug: string; name: string; category: Category; district: string; rating: number; reviews: number;
  priceFrom: number; verified: boolean; imageKey: string; status: Status;
};
export const toHit = (v: Vendor, status: Status): VendorHit => ({
  slug: v.slug, name: v.name, category: v.category, district: v.district, rating: v.rating, reviews: v.reviews,
  priceFrom: v.priceFrom, verified: v.verified, imageKey: v.imageKey, status,
});
