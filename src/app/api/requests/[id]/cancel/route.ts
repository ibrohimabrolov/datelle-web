import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { assertSameOrigin, json, route } from "@/server/http";
import { cancelRequest } from "@/server/requests";

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/requests/[id]/cancel">) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await ctx.params;
  return json({ request: await cancelRequest(user.id, id) });
});
