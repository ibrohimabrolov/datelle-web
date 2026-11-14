/* Desktop sign-in via the Telegram Login Widget (needs BotFather /setdomain). */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, body, HttpError, json, route } from "@/server/http";
import { authError, authRateLimit, mePayload, signIn } from "@/server/panel/service";
import { botToken } from "@/server/telegram/config";
import { verifyLoginWidget } from "@/server/telegram/signature";

const Field = z.union([z.string().max(512), z.number()]);
const Body = z.object({
  id: Field,
  first_name: z.string().max(256),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.string().max(512).optional(),
  auth_date: Field,
  hash: z.string().length(64),
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await authRateLimit(req);
  const token = botToken();
  if (!token) throw new HttpError(503, "bot_disabled", "Telegram orqali kirish hozircha yoqilmagan");

  const payload = await body(req, Body);
  const v = verifyLoginWidget(payload, token);
  if (!v.ok) throw authError(v.reason);

  const userId = await signIn(v.data.user, req);
  return json(await mePayload({ id: userId }));
});
