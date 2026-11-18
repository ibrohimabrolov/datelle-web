/* Landing content — copy 1:1 from Figma "Landing · Desktop" (299:2859). */

const BOT = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "floreal_uz_bot").replace(/^@/, "");
export const BOT_HANDLE = `@${BOT}`;
export const BOT_URL = `https://t.me/${BOT}`;
export const LOGIN_URL = "/panel/kirish";

export const NAV = [
  { href: "#imkoniyatlar", label: "Imkoniyatlar" },
  { href: "#qanday-ishlaydi", label: "Qanday ishlaydi" },
  { href: "#savollar", label: "Savollar" },
];

/* Landing/Menu (mobile + tablet, Figma 318:9851): pricing is a menu item there — no room for it in the bar */
export const MENU = [
  { href: "#imkoniyatlar", label: "Imkoniyatlar" },
  { href: "#qanday-ishlaydi", label: "Qanday ishlaydi" },
  { href: "#narxlar", label: "Narxlar" },
  { href: "#savollar", label: "Savollar" },
];

export const STATS = [
  { n: "1", unit: " daqiqa", label: "Studiyani ochish" },
  { n: "0", unit: " soʻm", label: "Birinchi 3 oy" },
  { n: "20", unit: ":00", label: "Har kuni botda eslatma" },
  { n: "2", unit: " qurilma", label: "Telefon va kompyuter" },
];

/* Tour stage — desktop: each tab is the Figma stage (1120×600, Landing/Tour · Size=Desktop) exported @2x per theme,
   so screens, shadows and the stage gradient match the design exactly.
   < 1024px: Landing/Tour · Size=Mobile — one Mini App screen per tab (tour/m/*, 240×432 visible part @2x) on a CSS stage. */
export const TOUR = [
  { id: "bosh", label: "Bosh sahifa", alt: "Floreal bosh sahifasi: kompyuterda tushum, qoldiq va keyingi 7 kun, yonida telefondagi kalendar", caption: "Bosh sahifa: bu oy tushum, umumiy qoldiq va keyingi 7 kun — bir qarashda." },
  { id: "kalendar", label: "Kalendar", alt: "Oylik kalendar: boʻsh, 1 joy va band kunlar; telefonda tanlangan kunning buyurtmalari", caption: "Kalendar: qaysi kun boʻsh, qaysi biri band — bir qarashda. Kunni bir bosishda yopasiz." },
  { id: "buyurtmalar", label: "Buyurtmalar", alt: "Buyurtmalar roʻyxati va buyurtma paneli: mijoz, sana, avans va qoldiq", caption: "Buyurtma: mijoz, sana, avans va qoldiq — bitta panelda. Toʻlovni bir bosishda qoʻshasiz." },
  { id: "telefonda", label: "Telefonda", alt: "Telegram ichida: buyurtmalar, bosh sahifa va botning kechki eslatmasi", caption: "Telefonda: hammasi Telegram ichida. Har kuni 20:00 da bot ertangi tadbirlarni eslatadi." },
];

export const FEATURES = [
  { img: "kalendar", badge: "Kalendar", icon: "kalendar", title: "Qaysi kun boʻsh — bir qarashda", text: "Boʻsh, 1 joy yoki band. Kunni bir bosishda yopasiz." },
  { img: "pul", badge: "Pul", icon: "pul", title: "Kim qancha qarz — unutilmaydi", text: "Avans, qoldiq, kechikkanlar va oylik tushum." },
  { img: "jamoa", badge: "Jamoa", icon: "jamoa", title: "Menejer ishlaydi, hisobot sizda", text: "Taklif linki bilan qoʻshasiz. Pul hisobotini faqat egasi koʻradi." },
  { img: "bot", badge: "Telegram bot", icon: "bot", title: "Har kuni 20:00 da — ertangi tadbirlar", text: "Kim, qayerda, qancha qoldiq — ilovani ochmasdan." },
] as const;

export const STEPS = [
  { title: `${BOT_HANDLE} ni oching`, text: ["Telegram'da Start bosing.", "Roʻyxatdan oʻtish shart emas."] },
  { title: "Studiyani yarating", text: ["Nomi, yoʻnalishi va kunlik", "sigʻimi — bir daqiqa."] },
  { title: "Birinchi buyurtma", text: ["Sana, mijoz, summa va avans — kalendarda darhol koʻrinadi."] },
];

const BASE_INCLUDES = [
  "3 tagacha foydalanuvchi",
  "Kalendar, buyurtma va pul",
  "Egasi uchun Dashboard",
  "Har kuni 20:00 da bot eslatmasi",
  "Eski buyurtmalarni kiritib beramiz",
];
export const PLANS = {
  monthly: { name: "OYLIK", desc: "Oyma-oy, istalgan payt toʻxtatasiz.", price: "299 000", unit: "soʻm / oy", note: ["Ishga tushirish", "+500 000 soʻm"], includes: BASE_INCLUDES },
  founder: {
    name: "ASOSCHI HAMKOR", chip: "10 TA JOY", desc: "Birinchi 10 ta studiya uchun.", price: "0 soʻm", unit: "3 oy", note: ["Keyin, umrbod", "149 000 soʻm / oy"],
    includes: ["Oylik tarifdagi hammasi", "Ishga tushirish bepul", "Shaxsan sozlab beramiz", "Narx umrbod 2 baravar arzon"],
  },
  yearly: { name: "YILLIK", desc: "Bir yilga oldindan — 2 oy bepul.", price: "2 990 000", unit: "soʻm / yil", note: ["Oyiga taxminan", "249 000 soʻm"], includes: BASE_INCLUDES },
};

export const FAQ = [
  {
    id: "mahsulot",
    label: "Mahsulot",
    items: [
      { q: "Mijozlarim buni koʻradimi?", a: "Yoʻq. Floreal — faqat siz va jamoangiz uchun. Mijozlar hech narsa koʻrmaydi." },
      { q: "Maʼlumotlarim kimda saqlanadi?", a: "Himoyalangan serverda, shifrlangan holda. Ularni faqat siz va jamoangiz koʻradi — biz hech kimga bermaymiz." },
      { q: "Telegram'siz ishlatsa boʻladimi?", a: "Kompyuterda brauzer orqali ishlaydi, kirish esa Telegram bilan tasdiqlanadi. Parol va SMS kerak emas." },
      { q: "Jamoamni qoʻsha olamanmi?", a: "Ha. Menejerga taklif linkini yuborasiz: u buyurtma va toʻlov kiritadi, tushum hisobotini faqat siz koʻrasiz." },
    ],
  },
  {
    id: "narx",
    label: "Narx va hamkorlik",
    items: [
      { q: "Ishga tushirish nima uchun pullik?", a: "Bir martalik 500 000 soʻm: eski buyurtmalaringizni kiritib beramiz va jamoani 1 soat oʻrgatamiz. Asoschi hamkorlar uchun bepul." },
      { q: "Istalgan payt toʻxtatsam boʻladimi?", a: "Ha. Oylik tarifda shartnoma yoʻq: keyingi oy toʻlamasangiz, obuna toʻxtaydi." },
      { q: "3 tadan koʻp xodim boʻlsa-chi?", a: "Har bir qoʻshimcha foydalanuvchi — oyiga 49 000 soʻm." },
      { q: "Asoschi hamkor boʻlish uchun nima kerak?", a: "3 oy tizimdan haqiqatan foydalanish va har 2 haftada 15 daqiqalik fikr. Evaziga 3 oy bepul, keyin umrbod 149 000 soʻm / oy." },
    ],
  },
];
