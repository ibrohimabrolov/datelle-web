import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { acceptReturn, getReturn, returnSchema } from "@/server/panel/props";
import { limit } from "@/server/ratelimit";

type Ctx = RouteContext<"/api/panel/props/returns/[orderId]">;

export const GET = route<Ctx>(async (req: NextRequest, { params }) => json(await getReturn(await requireStudio(req), (await params).orderId)));

export const POST = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await acceptReturn(ctx, (await params).orderId, await body(req, returnSchema)));
});
