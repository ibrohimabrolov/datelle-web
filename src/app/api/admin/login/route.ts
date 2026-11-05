import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminLogin } from "@/server/admin";
import { assertSameOrigin, body, clientIp, json, route } from "@/server/http";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const { password } = await body(req, z.object({ password: z.string().min(1, "Parolni kiriting").max(200) }));
  await adminLogin(password, clientIp(req));
  return json({ ok: true });
});
