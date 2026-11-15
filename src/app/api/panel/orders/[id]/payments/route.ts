import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { addPayment, paymentSchema } from "@/server/panel/orders";
import { limit } from "@/server/ratelimit";

export const POST = route<RouteContext<"/api/panel/orders/[id]/payments">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await addPayment(ctx, (await params).id, await body(req, paymentSchema)), { status: 201 });
});
