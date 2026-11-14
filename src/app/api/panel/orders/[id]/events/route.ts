import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { orderEvents } from "@/server/panel/orders";

export const GET = route<RouteContext<"/api/panel/orders/[id]/events">>(async (req: NextRequest, { params }) => {
  const ctx = await requireStudio(req);
  return json(await orderEvents(ctx, (await params).id));
});
