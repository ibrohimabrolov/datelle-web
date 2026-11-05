import type { NextRequest } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/server/auth";
import { assertSameOrigin, body, clientIp, json, route } from "@/server/http";
import { phoneSchema } from "@/server/phone";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const { phone } = await body(req, z.object({ phone: phoneSchema }));
  const res = await requestOtp(phone, clientIp(req));
  return json({ ok: true, phone, ...res });
});
