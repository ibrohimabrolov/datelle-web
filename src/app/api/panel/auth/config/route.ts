/* What the Kirish screen needs to render: which sign-in paths exist on this deployment. Public values only. */
import { connection } from "next/server";
import { json, route } from "@/server/http";
import { devLoginEnabled } from "@/server/panel/service";
import { botToken } from "@/server/telegram/config";

export const GET = route(async () => {
  await connection(); // env decides the answer at request time, never at build
  const token = botToken();
  return json({
    // the numeric part of the token is the bot's public user id (needed by the Login Widget popup)
    botId: token ? Number(token.split(":")[0]) : null,
    botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || null,
    devLogin: devLoginEnabled(),
  });
});
