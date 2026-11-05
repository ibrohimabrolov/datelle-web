import type { NextRequest } from "next/server";
import { adminRequests, REQUEST_FILTERS, requireAdmin } from "@/server/admin";
import { json, route } from "@/server/http";

export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const f = sp.get("holat") ?? "open";
  const filter = (REQUEST_FILTERS as readonly string[]).includes(f) ? (f as (typeof REQUEST_FILTERS)[number]) : "open";
  return json({ requests: await adminRequests(filter, (sp.get("q") ?? "").slice(0, 80)) });
});
