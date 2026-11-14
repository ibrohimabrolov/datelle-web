import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { getOrder, patchOrder, patchSchema } from "@/server/panel/orders";
import { limit } from "@/server/ratelimit";

type Ctx = RouteContext<"/api/panel/orders/[id]">;

export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  const ctx = await requireStudio(req);
  return json({ order: await getOrder(ctx, (await params).id) });
});

export const PATCH = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await patchOrder(ctx, (await params).id, await body(req, patchSchema)));
});
