import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { createStaff, staffSchema } from "@/server/panel/schedule";
import { limit } from "@/server/ratelimit";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await createStaff(ctx, await body(req, staffSchema)), { status: 201 });
});
