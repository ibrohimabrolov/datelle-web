import type { NextRequest } from "next/server";
import { vendorBySlugDb, vendorCalendar } from "@/server/catalog";
import { HttpError, json, route } from "@/server/http";
import { monthDates, monthOf, todayISO } from "@/lib/dates";

/* ?month=YYYY-MM → [{ date, status }] */
export const GET = route(async (req: NextRequest, ctx: RouteContext<"/api/vendors/[slug]/calendar">) => {
  const { slug } = await ctx.params;
  const month = req.nextUrl.searchParams.get("month") ?? monthOf(todayISO());
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(422, "validation", "month notoʻgʻri");
  const vendor = await vendorBySlugDb(slug);
  if (!vendor) throw new HttpError(404, "vendor_not_found", "Studiya topilmadi");
  const dates = monthDates(month);
  const days = await vendorCalendar(vendor.id, vendor.dailyCapacity, dates[0], dates[dates.length - 1]);
  return json({ month, days }, { cache: "public" });
});
