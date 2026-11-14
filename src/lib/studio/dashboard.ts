/* Dashboard maths — pure, shared by API, UI and tests. */
import { addMonths, monthDates } from "../dates";

/* "This month vs last month" compares the same stretch of days: 1–14 Nov vs 1–14 Oct.
   Comparing a half month with a full month would always look like a drop. */
export function periodWindow(today: string) {
  const prev = addMonths(today.slice(0, 7), -1);
  const days = monthDates(prev).length;
  const day = Math.min(Number(today.slice(8, 10)), days);
  return { from: `${prev}-01`, to: `${prev}-${String(day).padStart(2, "0")}` };
}

/* 48 600 000 → "48,6 mln"; 950 000 → "950 ming" — chart labels and axis */
export function compactSum(n: number) {
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)} mlrd`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)} mln`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} ming`;
  return String(Math.round(n));
}
const trim = (x: number) => (Math.round(x * 10) / 10).toString().replace(".", ",");

/* Hour in Tashkent → greeting */
export function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Xayrli tong";
  if (hour >= 12 && hour < 18) return "Xayrli kun";
  return "Xayrli kech";
}

/* "Nice" axis ceiling with 4 gridlines: 48,6 mln → 60 mln (ticks 0/20/40/60) */
export function niceMax(max: number, ticks = 3) {
  if (max <= 0) return ticks;
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return step * ticks;
}
