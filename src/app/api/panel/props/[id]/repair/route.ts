import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { repairProp, repairSchema } from "@/server/panel/props";
import { limit } from "@/server/ratelimit";

export const POST = route<RouteContext<"/api/panel/props/[id]/repair">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await repairProp(ctx, (await params).id, await body(req, repairSchema)));
});
