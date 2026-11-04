import type { StaticImageData } from "next/image";
import { BRAND } from "@/config/brand";

import gulnoza from "@/assets/img/vendor-gulnoza.png";
import oqsaroy from "@/assets/img/vendor-oqsaroy.png";
import lola from "@/assets/img/vendor-lola.png";
import navroz from "@/assets/img/vendor-navroz.png";
import zarafshon from "@/assets/img/vendor-zarafshon.png";
import bahor from "@/assets/img/vendor-bahor.png";
import evToy from "@/assets/img/event-toy.png";
import evQiz from "@/assets/img/event-qiz-uzatar.png";
import evTk from "@/assets/img/event-tugilgan-kun.png";
import evYub from "@/assets/img/event-yubiley.png";
import evKorp from "@/assets/img/event-korporativ.png";

export type Day = { wd: string; d: number; free: number; few?: boolean };

/* Iyun 2026 — 12-iyun, juma tanlangan */
export const DAYS: Day[] = [
  { wd: "Du", d: 8, free: 41 },
  { wd: "Se", d: 9, free: 38 },
  { wd: "Ch", d: 10, free: 36 },
  { wd: "Pa", d: 11, free: 35 },
  { wd: "Ju", d: 12, free: 34 },
  { wd: "Sh", d: 13, free: 6, few: true },
  { wd: "Ya", d: 14, free: 4, few: true },
  { wd: "Du", d: 15, free: 44 },
  { wd: "Se", d: 16, free: 47 },
  { wd: "Ch", d: 17, free: 45 },
];

export const WEEKDAY_FULL: Record<string, string> = {
  Du: "dushanba", Se: "seshanba", Ch: "chorshanba", Pa: "payshanba", Ju: "juma", Sh: "shanba", Ya: "yakshanba",
};

export type Vendor = {
  slug: string; name: string; rating: number; reviews: number;
  category: string; district: string; priceFrom: number; img: StaticImageData;
};

export const VENDORS: Vendor[] = [
  { slug: "gulnoza-decor", name: "Gulnoza Decor", rating: 4.9, reviews: 38, category: "Dekor", district: "Yunusobod", priceFrom: 3_000_000, img: gulnoza },
  { slug: "oq-saroy-event", name: "Oq Saroy Event", rating: 5.0, reviews: 21, category: "Dekor", district: "Mirzo Ulugʻbek", priceFrom: 6_500_000, img: oqsaroy },
  { slug: "lola-studio", name: "Lola Studio", rating: 4.7, reviews: 64, category: "Dekor", district: "Yakkasaroy", priceFrom: 2_500_000, img: lola },
  { slug: "navroz-dekor", name: "Navroʻz Dekor", rating: 4.6, reviews: 33, category: "Dekor", district: "Sergeli", priceFrom: 1_800_000, img: navroz },
  { slug: "zarafshon-decor", name: "Zarafshon Decor", rating: 4.9, reviews: 45, category: "Dekor", district: "Olmazor", priceFrom: 4_000_000, img: zarafshon },
  { slug: "bahor-studio", name: "Bahor Studio", rating: 4.8, reviews: 52, category: "Dekor", district: "Chilonzor", priceFrom: 2_200_000, img: bahor },
];

export const EVENTS = [
  { label: "Toʻy", img: evToy },
  { label: "Qiz uzatar", img: evQiz },
  { label: "Tugʻilgan kun", img: evTk },
  { label: "Yubiley", img: evYub },
  { label: "Korporativ", img: evKorp },
];

export const FAQ = [
  {
    q: "Studiya tasdiqlamasa nima boʻladi?",
    a: "Studiya 6 soat ichida javob beradi (22:00–08:00 hisoblanmaydi). Tasdiqlamasa yoki rad etsa, zadatok toʻliq qaytadi va boshqa boʻsh studiyalarni koʻrsatamiz.",
  },
  {
    q: "Bekor qilsam, zadatok qaytadimi?",
    a: "Bekor qilish sharti har bir paketda toʻlovdan oldin koʻrsatiladi. Qancha erta bekor qilsangiz, shuncha koʻp qaytadi — summani bron sahifasida darhol koʻrasiz.",
  },
  {
    q: "Studiya bilan qachon bogʻlana olaman?",
    a: "Bron tasdiqlangan zahoti studiya telefoni va Telegram’i ochiladi. Undan oldin savol boʻlsa, Telegram’da jamoamizga yozing.",
  },
  {
    q: "Oʻz gʻoyam boʻyicha dekor buyurtma qilsam boʻladimi?",
    a: "Ha. Studiya sahifasida “Individual buyurtma”ni tanlang, gʻoya va rasmlarni yuboring — studiya 24 soat ichida narx bilan javob beradi.",
  },
  {
    q: "Qanday toʻlash mumkin?",
    a: `Payme yoki Click orqali, Uzcard va Humo kartalari bilan. Zadatok ${BRAND.name} kafolati ostida turadi, qolgan qismi studiyaga tadbir kuni toʻlanadi.`,
  },
];

export const fmtSum = (n: number) => n.toLocaleString("ru-RU").replace(/ |,/g, " ") + " soʻm";
