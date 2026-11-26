/* Jamoa jadvali — shared by the API and the panel (Figma 09 · Jamoa jadvali). */
import { addDays, weekdayIdx } from "../dates";

export const TASK_KINDS = [
  { slug: "montaj", label: "Montaj" },
  { slug: "demontaj", label: "Demontaj" },
  { slug: "yetkazish", label: "Yetkazish" },
  { slug: "gul_bezak", label: "Gul bezak" },
  { slug: "buket", label: "Buket" },
  { slug: "boshqa", label: "Boshqa" },
] as const;
export type TaskKind = (typeof TASK_KINDS)[number]["slug"];
export const KIND_SLUGS = TASK_KINDS.map((k) => k.slug) as [TaskKind, ...TaskKind[]];
export const kindLabel = (slug: string) => TASK_KINDS.find((k) => k.slug === slug)?.label ?? slug;

export const STAFF_ROLES = ["Bosh dekorator", "Florist", "Montajchi", "Haydovchi", "Yordamchi"] as const;

/* Default length when no end time is given — enough to flag clashes without inventing precision */
export const DEFAULT_TASK_MIN = 180;
/* A day longer than this (first start → last end) is flagged in the staff panel */
export const LONG_DAY_H = 12;

export const weekStart = (iso: string) => addDays(iso, -weekdayIdx(iso)); // Monday
export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
/* [start, end) in minutes from the task day's midnight; overnight ends roll past 24:00 */
export function span(t: { startsAt: string; endsAt: string | null }) {
  const s = toMin(t.startsAt);
  let e = t.endsAt ? toMin(t.endsAt) : s + DEFAULT_TASK_MIN;
  if (e <= s) e += 24 * 60;
  return [s, e] as const;
}
export const overlaps = (a: { day: string; startsAt: string; endsAt: string | null }, b: { day: string; startsAt: string; endsAt: string | null }) => {
  const off = (d: string) => (Date.parse(d) - Date.parse(a.day)) / 60_000;
  const [as, ae] = span(a);
  const [bs0, be0] = span(b);
  const bs = bs0 + off(b.day);
  const be = be0 + off(b.day);
  return as < be && bs < ae;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
/* "Malika Toshpoʻlatova" → "Malika T." */
export const shortName = (name: string) => {
  const [a, b] = name.split(/\s+/);
  return b ? `${a} ${b[0]}.` : a ?? "";
};
