/* Datelle Studio orders — pure rules shared by API, UI and tests (Tech §2, §5). */
import { addDays, diffDays, weekdayIdx } from "../dates";

export type OrderStatus = "active" | "done" | "cancelled";
export const ORDER_VIEWS = ["upcoming", "debt", "past", "cancelled"] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

/* active → done | cancelled; done → active (marked by mistake); cancelled → active (restore) */
const NEXT: Record<OrderStatus, OrderStatus[]> = { active: ["done", "cancelled"], done: ["active"], cancelled: ["active"] };
export const canTransition = (from: OrderStatus, to: OrderStatus) => NEXT[from].includes(to);

export const balanceOf = (total: number, payments: { amount: number }[]) => total - payments.reduce((s, p) => s + p.amount, 0);

/* "Kechikdi" = the event already happened and money is still owed */
export const isOverdue = (date: string, balance: number, today: string) => balance > 0 && date < today;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Naqd" },
  { value: "card", label: "Karta" },
  { value: "transfer", label: "Oʻtkazma" },
] as const;
export const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

export const STATUS_LABEL: Record<OrderStatus, string> = { active: "Faol", done: "Bajarildi", cancelled: "Bekor qilingan" };

/* Mobile list grouping (Figma S4): "Shu hafta", "Keyingi hafta", then by month */
export function weekGroup(date: string, today: string, monthName: (iso: string) => string) {
  const monday = addDays(today, -weekdayIdx(today));
  const d = diffDays(date, monday);
  if (d >= 0 && d < 7) return "Shu hafta";
  if (d >= 7 && d < 14) return "Keyingi hafta";
  if (d < 0 && d >= -7) return "Oʻtgan hafta";
  return monthName(date);
}

/* Parse "9 000 000", "9000000", "9 mln" → 9000000 (MoneyInput) */
export function parseMoney(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/soʻm|so'm|sum/g, "");
  const mln = /^([\d\s.,]+)\s*(mln|million)$/.exec(s);
  if (mln) {
    const n = Number(mln[1].replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : null;
  }
  const digits = s.replace(/[\s .,]/g, "");
  if (!digits) return null;
  if (!/^\d+$/.test(digits)) return null;
  return Number(digits);
}
export const groupThousands = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
