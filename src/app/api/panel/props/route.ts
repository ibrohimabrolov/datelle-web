import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { createProp, createSchema, propOverview } from "@/server/panel/props";
import { limit } from "@/server/ratelimit";

/* Owner and manager — stock, not money */
export const GET = route(async (req: NextRequest) => json(await propOverview(await requireStudio(req))));

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await createProp(ctx, await body(req, createSchema)), { status: 201 });
});
