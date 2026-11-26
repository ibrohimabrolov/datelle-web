import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { getExpense, patchExpense, patchSchema, removeExpense } from "@/server/panel/expenses";
import { limit } from "@/server/ratelimit";

type Ctx = RouteContext<"/api/panel/expenses/[id]">;

export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  const ctx = await requireStudio(req, { role: "owner" });
  return json(await getExpense(ctx, (await params).id));
});

export const PATCH = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await patchExpense(ctx, (await params).id, await body(req, patchSchema)));
});

/* Soft delete; the toast undo calls …/restore */
export const DELETE = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await removeExpense(ctx, (await params).id));
});
