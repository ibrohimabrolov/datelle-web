/* Local/E2E only: sign in as a fake Telegram user without a bot.
   Off unless PANEL_DEV_LOGIN=1 AND not on Vercel — production can never enable it. */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, body, HttpError, json, route } from "@/server/http";
import { devLoginEnabled, mePayload, signIn } from "@/server/panel/service";

const Body = z.object({ id: z.number().int().positive().max(2 ** 52), firstName: z.string().trim().min(1).max(64).default("Test") });

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  if (!devLoginEnabled()) throw new HttpError(404, "not_found", "Topilmadi");
  const { id, firstName } = await body(req, Body);
  const userId = await signIn({ id, first_name: firstName }, req);
  return json(await mePayload({ id: userId }));
});
