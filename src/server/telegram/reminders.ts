/* Daily 20:00 reminder fan-out. The sender is injected so the loop is unit-tested
   without network; the cron route passes the real Bot API call. */
import { reminderMessage, type ReminderDigest, type SendMessage } from "./messages";

export type StudioDigest = {
  studioId: string;
  /* Telegram ids of owner + managers who haven't muted reminders */
  chatIds: number[];
  digest: ReminderDigest;
};

export type FanoutResult = { studios: number; sent: number; empty: number; failed: number; blocked: number[] };

type Send = (msg: SendMessage) => Promise<unknown>;
type IsPermanent = (e: unknown) => boolean;

/* Telegram allows ~30 msg/s to different chats; 40 ms spacing keeps us at ~25/s */
const SPACING_MS = 40;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fanOutReminders(
  studios: StudioDigest[],
  panelUrl: string,
  send: Send,
  isPermanent: IsPermanent = () => false,
  spacingMs = SPACING_MS,
): Promise<FanoutResult> {
  const res: FanoutResult = { studios: studios.length, sent: 0, empty: 0, failed: 0, blocked: [] };
  const seen = new Set<string>();

  for (const s of studios) {
    if (s.digest.orders.length === 0) {
      res.empty++;
      continue;
    }
    for (const chatId of s.chatIds) {
      // one person in two studios gets both digests, but never the same one twice
      const key = `${s.studioId}:${chatId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const msg = reminderMessage(chatId, s.digest, panelUrl);
      if (!msg) continue;
      try {
        await send(msg);
        res.sent++;
      } catch (e) {
        res.failed++;
        // user blocked the bot — caller can flag the member so we stop trying
        if (isPermanent(e)) res.blocked.push(chatId);
        else console.error("[reminders]", s.studioId, chatId, e);
      }
      if (spacingMs) await sleep(spacingMs);
    }
  }
  return res;
}
