import { BRAND } from "@/config/brand";
import type { EventSlug } from "@/data/catalog";

import evToy from "@/assets/img/event-toy.jpg";
import evQiz from "@/assets/img/event-qiz-uzatar.jpg";
import evTk from "@/assets/img/event-tugilgan-kun.jpg";
import evYub from "@/assets/img/event-yubiley.jpg";
import evKorp from "@/assets/img/event-korporativ.jpg";

/* Home "Shu kuni boʻsh" grid — Figma order */
export const HOME_FEATURED = ["gulnoza-decor", "oq-saroy-event", "lola-studio", "navroz-dekor", "zarafshon-decor", "bahor-studio"];

export const EVENTS: { label: string; slug: EventSlug; img: typeof evToy }[] = [
  { label: "Toʻy", slug: "toy", img: evToy },
  { label: "Qiz uzatar", slug: "qiz-uzatar", img: evQiz },
  { label: "Tugʻilgan kun", slug: "tugilgan-kun", img: evTk },
  { label: "Yubiley", slug: "yubiley", img: evYub },
  { label: "Korporativ", slug: "korporativ", img: evKorp },
];

export type FaqItem = { q: string; a: string; link?: { href: string; label: string } };

export const FAQ: FaqItem[] = [
  {
    q: "Studiya tasdiqlamasa nima boʻladi?",
    a: "Studiya 6 soat ichida javob beradi (22:00–08:00 hisoblanmaydi). Tasdiqlamasa yoki rad etsa, zadatok toʻliq qaytadi va boshqa boʻsh studiyalarni koʻrsatamiz.",
  },
  {
    q: "Bekor qilsam, zadatok qaytadimi?",
    a: "Studiya tanlagan siyosatga bogʻliq. Masalan, tadbirgacha 30 kundan koʻp qolganda moslashuvchan va oʻrtacha siyosatda 100% qaytadi. Shart har bir paketda toʻlovdan oldin koʻrsatiladi.",
    link: { href: "/kafolat#bekor-qilish", label: "Bekor qilish jadvali" },
  },
  {
    q: "Studiya bilan qachon bogʻlana olaman?",
    a: "Bron tasdiqlangan zahoti studiya telefoni va Telegram’i ochiladi. Undan oldin savol boʻlsa, Telegram’da jamoamizga yozing.",
  },
  {
    q: "Oʻz gʻoyam boʻyicha dekor buyurtma qilsam boʻladimi?",
    a: "Ha. Studiya sahifasida “Taklif soʻrash”ni bosing, gʻoya va rasmlarni yuboring — studiya 24 soat ichida aniq narx bilan javob beradi.",
  },
  {
    q: "Qanday toʻlash mumkin?",
    a: `Payme yoki Click orqali, Uzcard va Humo kartalari bilan. Zadatok ${BRAND.name} kafolati ostida turadi, qolgan qismi studiyaga tadbir oldidan toʻlanadi.`,
  },
];
