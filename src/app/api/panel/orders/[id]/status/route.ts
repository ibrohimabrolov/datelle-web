import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { setStatus, statusSchema } from "@/server/panel/orders";
import { limit } from "@/server/ratelimit";

export const POST = route<RouteContext<"/api/panel/orders/[id]/status">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  const { to } = await body(req, statusSchema);
  return json(await setStatus(ctx, (await params).id, to));
});
