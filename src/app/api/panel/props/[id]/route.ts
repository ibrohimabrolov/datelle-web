import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { getProp, patchProp, patchSchema, removeProp } from "@/server/panel/props";
import { limit } from "@/server/ratelimit";

type Ctx = RouteContext<"/api/panel/props/[id]">;

export const GET = route<Ctx>(async (req: NextRequest, { params }) => json(await getProp(await requireStudio(req), (await params).id)));

export const PATCH = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await patchProp(ctx, (await params).id, await body(req, patchSchema)));
});

/* Owner only: removing stock is a decision, not a daily action */
export const DELETE = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await removeProp(ctx, (await params).id));
});
