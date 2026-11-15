import type { NextRequest } from "next/server";
import { assertSameOrigin, json, route } from "@/server/http";
import { endPanelSession } from "@/server/panel/auth";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await endPanelSession();
  return json({ ok: true });
});
