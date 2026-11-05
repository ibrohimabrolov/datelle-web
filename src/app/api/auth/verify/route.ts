import type { NextRequest } from "next/server";
import { z } from "zod";
import { startSession, upsertUser, verifyOtp } from "@/server/auth";
import { assertSameOrigin, body, clientIp, json, route } from "@/server/http";
import { phoneSchema } from "@/server/phone";
import { limit } from "@/server/ratelimit";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await limit(`verify:ip:${clientIp(req)}`, 40, 3600);
  const { phone, code, name } = await body(
    req,
    z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/, "Kod 6 ta raqam"), name: z.string().trim().min(2).max(60).optional() }),
  );
  await verifyOtp(phone, code);
  const user = await upsertUser(phone, name);
  await startSession(user.id, req.headers.get("user-agent"));
  return json({ user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
});
