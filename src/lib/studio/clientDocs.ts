/* Client-facing texts — the smeta PDF and the balance reminder. Uzbek (Latin) and Russian:
   these go to the studio's clients, so they must read like the studio wrote them, not like an app.
   Pure; used by the server (PDF) and the browser (reminder modal). Unit-tested in tests/unit.test.ts. */
import { MONTHS } from "../dates";
import { eventLabel } from "./calendar";

export type DocLang = "uz" | "ru";
export const DOC_LANGS: { value: DocLang; label: string }[] = [
  { value: "uz", label: "Oʻzbekcha" },
  { value: "ru", label: "Русский" },
];
export const isDocLang = (v: unknown): v is DocLang => v === "uz" || v === "ru";

const MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const EVENTS_RU: Record<string, string> = {
  toy: "Свадьба",
  "qiz-uzatar": "Кыз узатар",
  "tugilgan-kun": "День рождения",
  yubiley: "Юбилей",
  korporativ: "Корпоратив",
  "beshik-toy": "Бешик-той",
  boshqa: "Мероприятие",
};
/* "toʻy dekori" / "оформление свадьбы" — used inside sentences */
const EVENT_PHRASE: Record<DocLang, Record<string, string>> = {
  uz: { toy: "toʻy", "qiz-uzatar": "qiz uzatar", "tugilgan-kun": "tugʻilgan kun", yubiley: "yubiley", korporativ: "korporativ", "beshik-toy": "beshik toʻy", boshqa: "tadbir" },
  ru: { toy: "свадьбы", "qiz-uzatar": "кыз узатар", "tugilgan-kun": "дня рождения", yubiley: "юбилея", korporativ: "корпоратива", "beshik-toy": "бешик-тоя", boshqa: "мероприятия" },
};

export const docEvent = (slug: string, lang: DocLang) => (lang === "ru" ? (EVENTS_RU[slug] ?? "Мероприятие") : eventLabel(slug));
export const docDate = (iso: string, lang: DocLang) => {
  const d = Number(iso.slice(8, 10));
  const m = Number(iso.slice(5, 7)) - 1;
  const y = iso.slice(0, 4);
  return lang === "ru" ? `${d} ${MONTHS_RU[m]} ${y}` : `${d}-${MONTHS[m]}, ${y}`;
};
const shortDocDate = (iso: string, lang: DocLang) => docDate(iso, lang).replace(/,? \d{4}$/, "");
/* non-breaking spaces: "9 000 000 soʻm" never splits across lines on the client's phone */
const num = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
export const docMoney = (n: number, lang: DocLang) => `${num(n)}\u00a0${lang === "ru" ? "сум" : "soʻm"}`;

export const METHOD_DOC: Record<DocLang, Record<string, string>> = {
  uz: { cash: "Naqd", card: "Karta", transfer: "Oʻtkazma" },
  ru: { cash: "Наличные", card: "Карта", transfer: "Перевод" },
};

export const SMETA_COPY = {
  uz: {
    title: "Smeta",
    issued: "Sana",
    client: "Mijoz",
    event: "Tadbir",
    date: "Kuni",
    venue: "Joy",
    guests: "Mehmonlar",
    service: "Xizmat",
    amount: "Summa",
    decor: (ev: string) => `${ev} — dekor va bezatish`,
    payments: "Toʻlovlar",
    total: "Jami",
    paid: "Toʻlandi",
    balance: "Qoldiq",
    settled: "Toʻliq toʻlangan",
    dueNote: "Qoldiq tadbir kunigacha toʻlanadi.",
    contact: "Aloqa",
    footer: "Floreal orqali tayyorlandi",
  },
  ru: {
    title: "Смета",
    issued: "Дата",
    client: "Клиент",
    event: "Мероприятие",
    date: "Дата",
    venue: "Место",
    guests: "Гости",
    service: "Услуга",
    amount: "Сумма",
    decor: (ev: string) => `${ev} — декор и оформление`,
    payments: "Оплаты",
    total: "Итого",
    paid: "Оплачено",
    balance: "Остаток",
    settled: "Оплачено полностью",
    dueNote: "Остаток оплачивается до дня мероприятия.",
    contact: "Контакт",
    footer: "Подготовлено в Floreal",
  },
} as const;

/* ——— balance reminder ——— */
export type ReminderInput = { client: string; date: string; eventType: string; total: number; paid: number; studio: string };

const firstName = (full: string) => full.trim().split(/\s+/)[0] || full.trim();

export function reminderText(o: ReminderInput, lang: DocLang): string {
  const balance = Math.max(0, o.total - o.paid);
  const name = firstName(o.client);
  const ev = EVENT_PHRASE[lang][o.eventType] ?? EVENT_PHRASE[lang].boshqa;
  if (lang === "ru") {
    return [
      `Здравствуйте, ${name}!`,
      `Напоминаем по оформлению ${ev} ${shortDocDate(o.date, "ru")}: остаток ${docMoney(balance, "ru")}` +
        (o.paid > 0 ? ` (всего ${num(o.total)}, оплачено ${num(o.paid)}).` : "."),
      "Оплатить можно до дня мероприятия. Если есть вопросы — пишите.",
      "",
      `С уважением, ${o.studio}`,
    ].join("\n");
  }
  return [
    `Assalomu alaykum, ${name}!`,
    `${shortDocDate(o.date, "uz")} kungi ${ev} bezagi boʻyicha eslatma: qoldiq ${docMoney(balance, "uz")}` +
      (o.paid > 0 ? ` (jami ${num(o.total)}, toʻlandi ${num(o.paid)}).` : "."),
    "Tadbir kunigacha toʻlasangiz boʻladi. Savol boʻlsa, yozing.",
    "",
    `Hurmat bilan, ${o.studio}`,
  ].join("\n");
}

/* sms: deep link — "?&body=" is the form both iOS and Android accept */
export const smsHref = (phone: string, text: string) => `sms:${phone}?&body=${encodeURIComponent(text)}`;
