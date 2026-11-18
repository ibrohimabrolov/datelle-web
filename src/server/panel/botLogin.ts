import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "../db";
import { callTelegram } from "../telegram/api";
import { COPY, parseCommand, parseLoginCallback, parseLoginStart, type TgUpdate } from "../telegram/messages";
import { cookieOpts } from "./auth";

/* Desktop sign-in through the Telegram bot — see schema.panelLogins.
   Security: the public id only opens the request in Telegram; logging in needs the
   httpOnly cookie of the browser that created it. The 4-digit code is shown on both
   screens so a forwarded link can't be approved blindly. One approval → one session. */
export const LOGIN_COOKIE = "dt_login";
const TTL_MS = 5 * 60_000;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createBotLogin() {
  const id = randomBytes(16).toString("base64url"); // 22 chars
  const secret = randomBytes(32).toString("base64url");
  const code = String(randomInt(0, 10_000)).padStart(4, "0");
  const expiresAt = new Date(Date.now() + TTL_MS);
  // housekeeping: requests are worthless a day after they expire
  await db.delete(schema.panelLogins).where(lt(schema.panelLogins.expiresAt, new Date(Date.now() - 86_400_000)));
  await db.insert(schema.panelLogins).values({ id, secretHash: sha256(secret), code, expiresAt });
  (await cookies()).set(LOGIN_COOKIE, secret, cookieOpts(expiresAt));
  return { start: `login_${id}`, code, expiresAt: expiresAt.toISOString() };
}

export type PollResult =
  | { state: "pending" | "expired" | "declined" | "missing" }
  | { state: "approved"; user: { id: number; first_name: string; last_name?: string; username?: string } };

/* Called by the creating browser. Consumes an approval exactly once (UPDATE … WHERE consumed_at IS NULL). */
export async function pollBotLogin(): Promise<PollResult> {
  const jar = await cookies();
  const secret = jar.get(LOGIN_COOKIE)?.value;
  if (!secret) return { state: "missing" };
  const [row] = await db.select().from(schema.panelLogins).where(eq(schema.panelLogins.secretHash, sha256(secret)));
  if (!row) return { state: "missing" };
  if (row.declinedAt) return { state: "declined" };
  if (row.approvedAt && row.tgUser && !row.consumedAt) {
    const [won] = await db
      .update(schema.panelLogins)
      .set({ consumedAt: new Date() })
      .where(and(eq(schema.panelLogins.id, row.id), isNull(schema.panelLogins.consumedAt)))
      .returning({ id: schema.panelLogins.id });
    if (won) {
      jar.set(LOGIN_COOKIE, "", cookieOpts(new Date(0)));
      return { state: "approved", user: row.tgUser };
    }
  }
  if (row.consumedAt || row.expiresAt.getTime() <= Date.now()) return { state: "expired" };
  return { state: "pending" };
}

type WebhookReply = Record<string, unknown> & { method: string };

/* Webhook side. Returns the Bot API call to answer with, or null if the update isn't a login one. */
export async function handleLoginUpdate(update: TgUpdate, botToken: string): Promise<WebhookReply | null> {
  const msg = update.message;
  if (msg?.chat.type === "private" && msg.from) {
    const cmd = parseCommand(msg.text);
    const id = cmd?.cmd === "start" ? parseLoginStart(cmd.arg) : undefined;
    if (!id) return null;
    const [row] = await db
      .update(schema.panelLogins)
      .set({ startedBy: msg.from.id })
      .where(
        and(
          eq(schema.panelLogins.id, id),
          gt(schema.panelLogins.expiresAt, new Date()),
          isNull(schema.panelLogins.approvedAt),
          isNull(schema.panelLogins.declinedAt),
          // first opener owns the request; re-sending /start from the same account is fine
          sql`(${schema.panelLogins.startedBy} is null or ${schema.panelLogins.startedBy} = ${msg.from.id})`,
        ),
      )
      .returning({ code: schema.panelLogins.code });
    if (!row) return { method: "sendMessage", chat_id: msg.chat.id, text: COPY.loginExpired };
    return {
      method: "sendMessage",
      chat_id: msg.chat.id,
      parse_mode: "HTML",
      text: COPY.loginAsk(row.code),
      reply_markup: {
        inline_keyboard: [[{ text: COPY.loginConfirm, callback_data: `lg:ok:${id}` }, { text: COPY.loginCancel, callback_data: `lg:no:${id}` }]],
      },
    };
  }

  const cb = update.callback_query;
  const parsed = parseLoginCallback(cb?.data);
  if (!cb || !parsed || !cb.message) return null;
  const { id, approve } = parsed;
  const from = cb.from;
  const [row] = await db
    .update(schema.panelLogins)
    .set(
      approve
        ? { approvedAt: new Date(), tgUser: { id: from.id, first_name: from.first_name, last_name: from.last_name, username: from.username } }
        : { declinedAt: new Date() },
    )
    .where(
      and(
        eq(schema.panelLogins.id, id),
        eq(schema.panelLogins.startedBy, from.id),
        gt(schema.panelLogins.expiresAt, new Date()),
        isNull(schema.panelLogins.approvedAt),
        isNull(schema.panelLogins.declinedAt),
      ),
    )
    .returning({ id: schema.panelLogins.id });

  // Stop the button spinner; best effort — the edit below is the real answer
  await callTelegram(botToken, "answerCallbackQuery", { callback_query_id: cb.id }, 3000).catch(() => {});
  return {
    method: "editMessageText",
    chat_id: cb.message.chat.id,
    message_id: cb.message.message_id,
    text: !row ? COPY.loginExpired : approve ? COPY.loginDone : COPY.loginDeclined,
  };
}
