/* Calendar maths on ISO dates ("2026-11-20") in Asia/Tashkent (UTC+5, no DST).
   Pure functions — safe on server and client. */

export const TZ_OFFSET_MIN = 5 * 60;
export const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"] as const;
export const WD_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] as const;
export const WD_FULL = ["dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fromUTC = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function todayISO(now: number = Date.now()) {
  return fromUTC(new Date(now + TZ_OFFSET_MIN * 60_000));
}
export const addDays = (iso: string, n: number) => {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
};
export const diffDays = (a: string, b: string) => Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000);
export const weekdayIdx = (iso: string) => (toUTC(iso).getUTCDay() + 6) % 7; // Mon = 0
export const isWeekend = (iso: string) => weekdayIdx(iso) >= 5;
export const dayNum = (iso: string) => Number(iso.slice(8, 10));
export const monthOf = (iso: string) => iso.slice(0, 7); // "2026-11"

export const dayShort = (iso: string) => `${dayNum(iso)}-${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
export const dayLabel = (iso: string) => `${dayShort(iso)}, ${WD_FULL[weekdayIdx(iso)]}`;
export const wdShort = (iso: string) => WD_SHORT[weekdayIdx(iso)];

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const name = MONTHS[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
}
export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
/* All dates of a month, ISO */
export function monthDates(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${ym}-${pad(i + 1)}`);
}

/* Booking window: tomorrow … one year ahead */
export const BOOKING_MIN_DAYS = 1;
export const BOOKING_MAX_DAYS = 365;
export function isBookable(iso: string, today = todayISO()) {
  const d = diffDays(iso, today);
  return d >= BOOKING_MIN_DAYS && d <= BOOKING_MAX_DAYS;
}
/* Default event date suggested to a new visitor */
export const defaultDate = (today = todayISO()) => addDays(today, 7);
