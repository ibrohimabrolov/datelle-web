/* Datelle Studio calendar maths. Pure — shared by API, UI and tests.
   Rules: claude/Datelle-STUDIO-TECH.md §2 (computed, never stored). */
import { addDays, monthDates, weekdayIdx } from "../dates";

export type DayStatus = "free" | "has" | "limited" | "booked" | "blocked";

/* blocked wins; load ≥ capacity → booked; one slot left (capacity > 1) → limited; any order → has */
export function dayStatus(load: number, capacity: number, blocked: boolean): DayStatus {
  if (blocked) return "blocked";
  if (load >= capacity) return "booked";
  if (capacity > 1 && load === capacity - 1) return "limited";
  return load > 0 ? "has" : "free";
}
export const freeSlots = (load: number, capacity: number) => Math.max(0, capacity - load);

/* Weeks (Mon-first) covering the month; null = day outside the month */
export function monthWeeks(ym: string): (string | null)[][] {
  const dates = monthDates(ym);
  const lead = weekdayIdx(dates[0]);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export const DAY_REASONS = [
  { value: "tamir", label: "Taʼmir" },
  { value: "dam", label: "Dam olish" },
  { value: "shaxsiy", label: "Shaxsiy" },
  { value: "boshqa", label: "Boshqa" },
] as const;
export type DayReason = (typeof DAY_REASONS)[number]["value"];
export const reasonLabel = (r: string | null | undefined) => DAY_REASONS.find((x) => x.value === r)?.label ?? null;

/* Event types a studio picks from (same slugs as the marketplace, kept here so the panel never bundles the catalog) */
export const STUDIO_EVENTS = [
  { slug: "toy", label: "Toʻy" },
  { slug: "qiz-uzatar", label: "Qiz uzatar" },
  { slug: "tugilgan-kun", label: "Tugʻilgan kun" },
  { slug: "yubiley", label: "Yubiley" },
  { slug: "korporativ", label: "Korporativ" },
  { slug: "beshik-toy", label: "Beshik toʻy" },
  { slug: "boshqa", label: "Boshqa" },
] as const;
export const eventLabel = (slug: string) => STUDIO_EVENTS.find((e) => e.slug === slug)?.label ?? "Tadbir";

/* Event type → Figma event colour family (event/wedding|engagement|birthday|other) */
export type EventTone = "wedding" | "engagement" | "birthday" | "other";
export function eventTone(slug: string): EventTone {
  if (slug === "toy") return "wedding";
  if (slug === "qiz-uzatar") return "engagement";
  if (slug === "tugilgan-kun" || slug === "beshik-toy") return "birthday";
  return "other";
}

/* Blocking window: from today to two years ahead (past days can still be re-opened) */
export const BLOCK_MAX_DAYS = 730;
export const canBlock = (iso: string, today: string) => iso >= today && iso <= addDays(today, BLOCK_MAX_DAYS);
