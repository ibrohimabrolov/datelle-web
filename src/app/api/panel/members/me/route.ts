import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { meMemberPatch, setMyReminders } from "@/server/panel/team";

/* Each member decides about their own evening reminder */
export const PATCH = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  const { remindersOn } = await body(req, meMemberPatch);
  return json(await setMyReminders(ctx, remindersOn));
});
