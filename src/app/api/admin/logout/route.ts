import type { NextRequest } from "next/server";
import { adminLogout } from "@/server/admin";
import { assertSameOrigin, json, route } from "@/server/http";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await adminLogout();
  return json({ ok: true });
});
