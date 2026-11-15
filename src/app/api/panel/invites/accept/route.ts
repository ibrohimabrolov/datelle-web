import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requirePanelUser } from "@/server/panel/auth";
import { mePayload } from "@/server/panel/service";
import { acceptInvite } from "@/server/panel/team";
import { limit } from "@/server/ratelimit";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requirePanelUser();
  await limit(`panel:invite-check:${user.id}`, 60, 3600);
  const { token } = await body(req, z.object({ token: z.string().min(1).max(80) }));
  const r = await acceptInvite(user, token);
  return json({ ...r, ...(await mePayload(user)) });
});
