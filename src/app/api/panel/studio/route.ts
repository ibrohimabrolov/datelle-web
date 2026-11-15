import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { patchStudio, studioDetails, studioPatch } from "@/server/panel/team";
import { limit } from "@/server/ratelimit";

export const GET = route(async (req: NextRequest) => json(await studioDetails(await requireStudio(req))));

export const PATCH = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await patchStudio(ctx, await body(req, studioPatch)));
});
