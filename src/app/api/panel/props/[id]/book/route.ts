import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { bookProp, bookSchema } from "@/server/panel/props";
import { limit } from "@/server/ratelimit";

export const POST = route<RouteContext<"/api/panel/props/[id]/book">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await bookProp(ctx, (await params).id, await body(req, bookSchema)));
});
