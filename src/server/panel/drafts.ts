import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { looksLikeOrder, parseOrder, type ParsedOrder } from "@/lib/studio/parseOrder";
import { db, schema } from "../db";
import { callTelegram, TelegramError } from "../telegram/api";
import { COPY, draftCard, draftMessage, forwardSender, messageText, parseCommand, type TgUpdate } from "../telegram/messages";
import type { PanelUser } from "./auth";

/* Forward → buyurtma (schema.orderDrafts).
   A studio member forwards a client's chat to the bot; consecutive messages within MERGE_MS
   from the same client fold into one draft, and the bot keeps ONE card updated (editMessageText)
   instead of answering every forward. Parsing is local (parseOrder) — nothing leaves our server. */
const MERGE_MS = 3 * 60_000;
const TTL_MS = 7 * 86_400_000;
const MAX_TEXT = 4000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/* Studio member behind a Telegram account, or null (strangers get the normal help reply) */
async function memberByTelegram(tgId: number) {
  const [row] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .innerJoin(schema.studioMembers, eq(schema.studioMembers.userId, schema.users.id))
    .where(eq(schema.users.telegramId, tgId))
    .limit(1);
  return row ?? null;
}

/* Webhook hook: true when the update became (part of) a draft and the bot already answered */
export async function handleDraftUpdate(update: TgUpdate, token: string, panelUrl: string): Promise<boolean> {
  const msg = update.message;
  if (!msg || msg.chat.type !== "private" || !msg.from) return false;
  const text = messageText(msg);
  if (!text || parseCommand(text)) return false;

  const forwarded = Boolean(msg.forward_origin);
  const sender = forwardSender(msg);
  // typed text only counts when it clearly carries an order (a date, a phone or a price)
  if (!forwarded && !looksLikeOrder(parseOrder(text))) return false;
  if (!(await memberByTelegram(msg.from.id))) return false;

  const tgUserId = msg.from.id;
  const chatId = msg.chat.id;

  await db.transaction(async (tx) => {
    // one writer per Telegram user: parallel webhook deliveries of a multi-forward queue up here
    await tx.execute(sql`select pg_advisory_xact_lock(${tgUserId}::bigint)`);
    const now = new Date();
    const [recent] = await tx
      .select()
      .from(schema.orderDrafts)
      .where(
        and(
          eq(schema.orderDrafts.tgUserId, tgUserId),
          isNull(schema.orderDrafts.consumedAt),
          gt(schema.orderDrafts.updatedAt, new Date(now.getTime() - MERGE_MS)),
        ),
      )
      .orderBy(desc(schema.orderDrafts.updatedAt))
      .limit(1);

    // a different client's chat starts a new draft
    const sameClient = recent && (!sender || !recent.senderName || recent.senderName === sender);
    if (recent && sameClient) {
      const merged = `${recent.text ?? ""}\n${text}`.slice(-MAX_TEXT);
      const senderName = recent.senderName ?? sender;
      const parsed = parseOrder(merged, { senderName });
      const parts = recent.parts + 1;
      await tx
        .update(schema.orderDrafts)
        .set({ text: merged, senderName, parsed, parts, updatedAt: now, expiresAt: new Date(now.getTime() + TTL_MS) })
        .where(eq(schema.orderDrafts.id, recent.id));
      const messageId = await upsertCard(token, chatId, recent.botMessageId, parsed, parts, recent.id, panelUrl);
      if (messageId !== recent.botMessageId) await tx.update(schema.orderDrafts).set({ botMessageId: messageId }).where(eq(schema.orderDrafts.id, recent.id));
      return;
    }

    // housekeeping: drop expired drafts (raw chats are personal data)
    await tx.delete(schema.orderDrafts).where(lt(schema.orderDrafts.expiresAt, now));
    const id = randomBytes(12).toString("base64url");
    const parsed = parseOrder(text, { senderName: sender });
    await tx.insert(schema.orderDrafts).values({
      id,
      tgUserId,
      text: text.slice(0, MAX_TEXT),
      senderName: sender,
      parsed,
      expiresAt: new Date(now.getTime() + TTL_MS),
    });
    const messageId = await upsertCard(token, chatId, null, parsed, 1, id, panelUrl);
    await tx.update(schema.orderDrafts).set({ botMessageId: messageId }).where(eq(schema.orderDrafts.id, id));
  });
  return true;
}

/* Edit the existing card; if it's gone (deleted, >48h) send a fresh one. Returns the card's message_id. */
async function upsertCard(token: string, chatId: number, messageId: number | null, p: ParsedOrder, parts: number, id: string, panelUrl: string) {
  const payload = draftMessage(chatId, p, parts, id, panelUrl);
  if (messageId) {
    try {
      await callTelegram(token, "editMessageText", { ...payload, message_id: messageId });
      return messageId;
    } catch (e) {
      if (e instanceof TelegramError && /not modified/i.test(e.description)) return messageId;
      // fall through: send a new card
    }
  }
  const sent = await callTelegram<{ message_id: number }>(token, "sendMessage", payload);
  return sent.message_id;
}

/* ——— panel side ——— */

export async function getDraft(user: PanelUser, id: string): Promise<{ id: string; parsed: ParsedOrder; parts: number } | null> {
  if (!user.telegramId || !/^[A-Za-z0-9_-]{16}$/.test(id)) return null;
  const [row] = await db
    .select({ id: schema.orderDrafts.id, parsed: schema.orderDrafts.parsed, parts: schema.orderDrafts.parts })
    .from(schema.orderDrafts)
    .where(
      and(
        eq(schema.orderDrafts.id, id),
        eq(schema.orderDrafts.tgUserId, user.telegramId),
        isNull(schema.orderDrafts.consumedAt),
        gt(schema.orderDrafts.expiresAt, new Date()),
      ),
    );
  return row ?? null;
}

/* Inside the order-create transaction: mark used and wipe the raw chat. Returns the card to close, if any. */
export async function consumeDraft(tx: Tx, user: PanelUser, id: string, orderId: string) {
  if (!user.telegramId) return null;
  const [row] = await tx
    .update(schema.orderDrafts)
    .set({ consumedAt: new Date(), text: null, orderId })
    .where(and(eq(schema.orderDrafts.id, id), eq(schema.orderDrafts.tgUserId, user.telegramId), isNull(schema.orderDrafts.consumedAt)))
    .returning({ botMessageId: schema.orderDrafts.botMessageId, parsed: schema.orderDrafts.parsed, parts: schema.orderDrafts.parts });
  return row ? { chatId: user.telegramId, ...row } : null;
}

/* After commit, best effort: turn the bot card into a "saved" receipt and drop its button */
export async function closeDraftCard(token: string | null, card: Awaited<ReturnType<typeof consumeDraft>>) {
  if (!token || !card?.botMessageId) return;
  await callTelegram(token, "editMessageText", {
    chat_id: card.chatId,
    message_id: card.botMessageId,
    parse_mode: "HTML",
    text: `${draftCard(card.parsed, card.parts).split("\n\n").slice(0, 2).join("\n\n")}\n\n${COPY.draftSaved}`,
    reply_markup: { inline_keyboard: [] },
  }, 3000).catch(() => {});
}
