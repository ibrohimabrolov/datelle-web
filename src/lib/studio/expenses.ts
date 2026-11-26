/* Xarajatlar — shared by the API and the panel (Figma 10 · Xarajatlar). */

export const EXPENSE_CATEGORIES = [
  { slug: "gullar", label: "Gullar" },
  { slug: "ish_haqi", label: "Ish haqi" },
  { slug: "transport", label: "Transport" },
  { slug: "ijara", label: "Ijara" },
  { slug: "boshqa", label: "Boshqa" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = EXPENSE_CATEGORIES.map((c) => c.slug) as [ExpenseCategory, ...ExpenseCategory[]];
export const categoryLabel = (slug: string) => EXPENSE_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

/* Margin below this reads as a warning (Figma: Sardor Aliyev · marja 19% in money/due) */
export const LOW_MARGIN = 25;

/* profit share of revenue, whole percent; null when there is no revenue to divide by */
export const marginPct = (revenue: number, cost: number) => (revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : null);

/* share of a total, whole percent, never NaN */
export const sharePct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
