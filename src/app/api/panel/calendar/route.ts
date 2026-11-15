import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { monthView, parseMonth } from "@/server/panel/calendar";

export const GET = route(async (req: NextRequest) => {
  const ctx = await requireStudio(req);
  return json(await monthView(ctx, parseMonth(req.nextUrl.searchParams.get("month"))));
});
