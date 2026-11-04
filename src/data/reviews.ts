import type { Vendor } from "./catalog";

/* Mock reviews — placeholder copy for the demo; real ones come from completed bookings. */
const POOL = [
  { name: "Dilnoza R.", meta: "Toʻy · May 2026", body: "Zal biz oʻylagandan ham chiroyli chiqdi. Narx kelishilganidek qoldi, montaj vaqtida tugadi. Jonli gullar ertasi kuni ham yangi turardi." },
  { name: "Aziz K.", meta: "Yubiley · Aprel 2026", body: "Onamning 60 yilligi uchun buyurtma qildik. Taklif bir soatda keldi, nima kirishini aniq yozib berishdi." },
  { name: "Madina S.", meta: "Qiz uzatar · Aprel 2026", body: "Eskizni oldindan koʻrsatishdi, ikki marta oʻzgartirdik — qoʻshimcha pul soʻrashmadi." },
  { name: "Javohir T.", meta: "Toʻy · Mart 2026", body: "Zadatokni ilova orqali toʻladik, qolganini tadbir oldidan. Hammasi shaffof boʻldi." },
  { name: "Nilufar A.", meta: "Tugʻilgan kun · Mart 2026", body: "Kichik zal uchun ham jiddiy yondashishdi. Fotozona mehmonlarga juda yoqdi." },
  { name: "Sardor M.", meta: "Korporativ · Fevral 2026", body: "Ofis tadbiriga 3 kunda tayyorlashdi. Vaqtida keldi, vaqtida yigʻishtirdi." },
];

export function reviewsFor(v: Vendor) {
  const start = (v.rank - 1) % POOL.length;
  return [...POOL.slice(start), ...POOL.slice(0, start)];
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .replace(/[^A-Za-zʻ’]/g, "")
    .slice(0, 2)
    .toUpperCase();
