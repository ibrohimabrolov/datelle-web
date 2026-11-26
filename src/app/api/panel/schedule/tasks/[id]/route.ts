import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { getTask, patchTask, removeTask, taskPatch } from "@/server/panel/schedule";
import { limit } from "@/server/ratelimit";

type Ctx = RouteContext<"/api/panel/schedule/tasks/[id]">;

export const GET = route<Ctx>(async (req: NextRequest, { params }) => json(await getTask(await requireStudio(req), (await params).id)));

export const PATCH = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await patchTask(ctx, (await params).id, await body(req, taskPatch)));
});

export const DELETE = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await removeTask(ctx, (await params).id));
});
