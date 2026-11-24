import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { leaveStudio, meMemberPatch, setMyReminders } from "@/server/panel/team";

/* Each member decides about their own evening reminder */
export const PATCH = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  const { remindersOn } = await body(req, meMemberPatch);
  return json(await setMyReminders(ctx, remindersOn));
});

/* A manager leaves the studio (Sozlamalar · menejer → "Tark etish") */
export const DELETE = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  return json(await leaveStudio(await requireStudio(req)));
});
