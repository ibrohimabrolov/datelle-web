/* Mini App sign-in. Runs on every Mini App open — we never rely on the webview's cookie jar. */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, body, HttpError, json, route } from "@/server/http";
import { authError, authRateLimit, mePayload, signIn } from "@/server/panel/service";
import { botToken } from "@/server/telegram/config";
import { verifyInitData } from "@/server/telegram/signature";

const Body = z.object({ initData: z.string().min(1).max(4096) });

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await authRateLimit(req);
  const token = botToken();
  if (!token) throw new HttpError(503, "bot_disabled", "Telegram orqali kirish hozircha yoqilmagan");

  const { initData } = await body(req, Body);
  const v = verifyInitData(initData, token);
  if (!v.ok) throw authError(v.reason);

  const userId = await signIn(v.data.user, req);
  return json({ ...(await mePayload({ id: userId })), startParam: v.data.startParam ?? null });
});
