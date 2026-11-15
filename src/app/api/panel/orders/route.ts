import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { createOrder, createSchema, listOrders, listQuery } from "@/server/panel/orders";
import { limit } from "@/server/ratelimit";

export const GET = route(async (req: NextRequest) => {
  const ctx = await requireStudio(req);
  const q = listQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
  return json(await listOrders(ctx, q));
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await createOrder(ctx, await body(req, createSchema)), { status: 201 });
});
