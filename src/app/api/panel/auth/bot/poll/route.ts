/* Desktop sign-in through the Telegram bot — step 2: the creating browser polls (every 2 s).
   Approved → panel session cookie + /me payload, exactly once. */
import type { NextRequest } from "next/server";
import { assertSameOrigin, clientIp, json, route } from "@/server/http";
import { pollBotLogin } from "@/server/panel/botLogin";
import { mePayload, signIn } from "@/server/panel/service";
import { limit } from "@/server/ratelimit";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await limit(`panel:poll:${clientIp(req)}`, 900, 3600); // 5 min × 1 per 2 s = 150 per request
  const r = await pollBotLogin();
  if (r.state !== "approved") return json({ state: r.state }, { cache: "no-store" });
  const userId = await signIn(r.user, req);
  return json({ state: "approved", me: await mePayload({ id: userId }) }, { cache: "no-store" });
});
