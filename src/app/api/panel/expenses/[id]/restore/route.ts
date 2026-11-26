import type { NextRequest } from "next/server";
import { assertSameOrigin, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { restoreExpense } from "@/server/panel/expenses";
import { limit } from "@/server/ratelimit";

export const POST = route<RouteContext<"/api/panel/expenses/[id]/restore">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await restoreExpense(ctx, (await params).id));
});
