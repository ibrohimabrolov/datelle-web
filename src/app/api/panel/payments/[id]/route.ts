import type { NextRequest } from "next/server";
import { assertSameOrigin, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { removePayment } from "@/server/panel/orders";
import { limit } from "@/server/ratelimit";

/* Soft delete: owner always; a manager only their own payment within 10 min (undo) */
export const DELETE = route<RouteContext<"/api/panel/payments/[id]">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req); // client sends DELETE with a JSON body, so the same CSRF rule as every write applies
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await removePayment(ctx, (await params).id));
});
