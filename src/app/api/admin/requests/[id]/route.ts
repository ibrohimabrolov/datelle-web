import type { NextRequest } from "next/server";
import { adminTransition, requireAdmin, transitionSchema } from "@/server/admin";
import { assertSameOrigin, body, json, route } from "@/server/http";

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/admin/requests/[id]">) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  return json(await adminTransition(id, await body(req, transitionSchema)));
});
