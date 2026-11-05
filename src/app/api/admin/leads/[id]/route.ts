import type { NextRequest } from "next/server";
import { adminUpdateLead, leadPatchSchema, requireAdmin } from "@/server/admin";
import { assertSameOrigin, body, json, route } from "@/server/http";

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/admin/leads/[id]">) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  return json(await adminUpdateLead(id, await body(req, leadPatchSchema)));
});
