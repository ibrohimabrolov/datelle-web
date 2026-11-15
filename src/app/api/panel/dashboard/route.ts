import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { dashboard } from "@/server/panel/dashboard";

/* Owner only (MVP-SCOPE: managers don't see money totals) */
export const GET = route(async (req: NextRequest) => {
  const ctx = await requireStudio(req, { role: "owner" });
  return json(await dashboard(ctx));
});
