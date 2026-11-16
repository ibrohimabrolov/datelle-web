/* Desktop sign-in through @datelle_bot — step 1: open a 5-minute request.
   Returns the deep-link start param and the code to compare in Telegram. */
import type { NextRequest } from "next/server";
import { assertSameOrigin, HttpError, json, route } from "@/server/http";
import { createBotLogin } from "@/server/panel/botLogin";
import { authRateLimit } from "@/server/panel/service";
import { botToken, botUsername } from "@/server/telegram/config";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await authRateLimit(req);
  const username = botUsername();
  if (!botToken() || !username) throw new HttpError(503, "bot_disabled", "Telegram orqali kirish hozircha yoqilmagan");
  const login = await createBotLogin();
  return json({ ...login, url: `https://t.me/${username}?start=${login.start}` }, { cache: "no-store" });
});
