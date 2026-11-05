import type { NextRequest } from "next/server";
import { parseFilters } from "@/data/catalog";
import { availabilitySummary } from "@/server/catalog";
import { HttpError, json, route } from "@/server/http";
import { addDays, isISODate, todayISO } from "@/lib/dates";

/* Free-vendor counts per day for the given filters: ?from=YYYY-MM-DD&days=N&tur=…&tadbir=… */
export const GET = route(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? todayISO();
  if (!isISODate(from)) throw new HttpError(422, "validation", "from notoʻgʻri");
  const days = Math.min(Math.max(Number(sp.get("days")) || 14, 1), 62);
  if (from < addDays(todayISO(), -31)) throw new HttpError(422, "validation", "Oʻtgan sanalar uchun maʼlumot yoʻq");
  const { tur, tadbir, tuman, byudjet, chips } = parseFilters(sp);
  return json({ from, days: await availabilitySummary({ tur, tadbir, tuman, byudjet, chips }, from, days) }, { cache: "public" });
});
