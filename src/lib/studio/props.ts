/* Rekvizit — shared by the API and the panel (Figma 08 · Rekvizit). */
import { addDays } from "../dates";

export const PROP_CATEGORIES = [
  { slug: "vazalar", label: "Vazalar", prefix: "VZ", icon: "gift" },
  { slug: "arkalar", label: "Arkalar", prefix: "ARK", icon: "star" },
  { slug: "stol", label: "Stol bezaklari", prefix: "SB", icon: "heart" },
  { slug: "yoritish", label: "Yoritish", prefix: "YR", icon: "lightning" },
  { slug: "matolar", label: "Matolar", prefix: "MT", icon: "tag" },
  { slug: "boshqa", label: "Boshqa", prefix: "BQ", icon: "box" },
] as const;

export type PropCategory = (typeof PROP_CATEGORIES)[number]["slug"];
export const PROP_SLUGS = PROP_CATEGORIES.map((c) => c.slug) as [PropCategory, ...PropCategory[]];
export const propCategory = (slug: string) => PROP_CATEGORIES.find((c) => c.slug === slug) ?? PROP_CATEGORIES[PROP_CATEGORIES.length - 1];

/* Props leave on the event day and are due back the next day; after that they are "Qaytmagan" */
export const returnDue = (eventDate: string) => addDays(eventDate, 1);
export const isOverdue = (eventDate: string, today: string) => today > returnDue(eventDate);

/* Fewer than a quarter left in the warehouse while some are out → "Kam qoldi" */
export const LOW_STOCK = 0.25;

export type PropState = "qaytmagan" | "kam" | "tadbirda" | "tamirda" | "omborda";
/* One status pill per row, most urgent first */
export function propState(p: { total: number; stock: number; out: number; overdue: number; repair: number }): PropState {
  if (p.overdue > 0) return "qaytmagan";
  if (p.out > 0 && p.stock < p.total * LOW_STOCK) return "kam";
  if (p.out > 0) return "tadbirda";
  if (p.repair > 0) return "tamirda";
  return "omborda";
}
