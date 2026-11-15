import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { dayBody, setDay } from "@/server/panel/calendar";
import { limit } from "@/server/ratelimit";

/* Close or reopen a day. Owner and manager alike (Tech §3). */
export const PUT = route<RouteContext<"/api/panel/days/[date]">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  const { date } = await params;
  return json(await setDay(ctx, date, await body(req, dayBody)));
});
