import type { NextRequest } from "next/server";
import { adminSetDay, adminVendorDays, dayPatchSchema, requireAdmin } from "@/server/admin";
import { assertSameOrigin, body, json, route } from "@/server/http";

export const GET = route(async (_req: NextRequest, ctx: RouteContext<"/api/admin/vendors/[id]/days">) => {
  await requireAdmin();
  const { id } = await ctx.params;
  return json({ days: await adminVendorDays(id) });
});

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/admin/vendors/[id]/days">) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  return json(await adminSetDay(id, await body(req, dayPatchSchema)));
});
