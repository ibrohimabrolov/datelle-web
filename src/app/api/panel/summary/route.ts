import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { orderCounts } from "@/server/panel/orders";

/* Small numbers the shell shows everywhere (nav badge). Phase 5 extends this for the Dashboard. */
export const GET = route(async (req: NextRequest) => {
  const ctx = await requireStudio(req);
  return json({ counts: await orderCounts(ctx) });
});
