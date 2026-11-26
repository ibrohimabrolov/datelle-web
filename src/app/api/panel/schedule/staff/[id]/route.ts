import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { patchStaff, removeStaff, staffPatch } from "@/server/panel/schedule";
import { limit } from "@/server/ratelimit";

type Ctx = RouteContext<"/api/panel/schedule/staff/[id]">;

export const PATCH = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await patchStaff(ctx, (await params).id, await body(req, staffPatch)));
});

export const DELETE = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await removeStaff(ctx, (await params).id));
});
