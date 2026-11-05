import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { json, route } from "@/server/http";
import { getRequest } from "@/server/requests";

export const GET = route(async (_req: NextRequest, ctx: RouteContext<"/api/requests/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return json({ request: await getRequest(user.id, id) });
});
