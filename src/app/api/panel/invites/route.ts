import type { NextRequest } from "next/server";
import { assertSameOrigin, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { createInvite, listInvites } from "@/server/panel/team";
import { limit } from "@/server/ratelimit";

export const GET = route(async (req: NextRequest) => json(await listInvites(await requireStudio(req, { role: "owner" }))));

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  await limit(`panel:invite:${ctx.studio.id}`, 30, 86_400);
  return json(await createInvite(ctx), { status: 201 });
});
