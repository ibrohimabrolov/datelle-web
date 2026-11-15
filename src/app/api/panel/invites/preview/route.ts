import type { NextRequest } from "next/server";
import { HttpError, json, route } from "@/server/http";
import { requirePanelUser } from "@/server/panel/auth";
import { previewInvite } from "@/server/panel/team";
import { limit } from "@/server/ratelimit";

export const GET = route(async (req: NextRequest) => {
  const user = await requirePanelUser();
  await limit(`panel:invite-check:${user.id}`, 60, 3600);
  const t = req.nextUrl.searchParams.get("t");
  if (!t) throw new HttpError(404, "invite_invalid", "Taklif linki notoʻgʻri");
  return json(await previewInvite(user, t));
});
