import type { NextRequest } from "next/server";
import { parseFilters } from "@/data/catalog";
import { searchVendors } from "@/server/catalog";
import { json, route } from "@/server/http";

export const GET = route(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const f = parseFilters(sp);
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 9, 1), 60);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);
  const res = await searchVendors(f, { limit, offset });
  return json({ filters: f, ...res }, { cache: "public" });
});
