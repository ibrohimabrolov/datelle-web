import type { NextRequest } from "next/server";
import { adminUpdateApplication, applicationPatchSchema, requireAdmin } from "@/server/admin";
import { assertSameOrigin, body, json, route } from "@/server/http";

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/admin/applications/[id]">) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  return json(await adminUpdateApplication(id, await body(req, applicationPatchSchema)));
});
