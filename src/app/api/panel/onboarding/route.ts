import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requirePanelUser } from "@/server/panel/auth";
import { createStudio, onboardingSchema } from "@/server/panel/service";
import { limit } from "@/server/ratelimit";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requirePanelUser();
  await limit(`panel:write:${user.id}`, 300, 3600);
  const input = await body(req, onboardingSchema);
  const studio = await createStudio(user.id, input);
  return json({ studio }, { status: 201 });
});
