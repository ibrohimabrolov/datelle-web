import type { NextRequest } from "next/server";
import { endSession } from "@/server/auth";
import { assertSameOrigin, json, route } from "@/server/http";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await endSession();
  return json({ ok: true });
});
