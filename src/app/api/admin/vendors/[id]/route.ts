import type { NextRequest } from "next/server";
import { adminUpdateVendor, requireAdmin, vendorPatchSchema } from "@/server/admin";
import { assertSameOrigin, body, json, route } from "@/server/http";

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/admin/vendors/[id]">) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  return json(await adminUpdateVendor(id, await body(req, vendorPatchSchema)));
});
