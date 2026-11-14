import "server-only";
import type { StudioDigest } from "./reminders";

/* Tomorrow's active orders per studio, with recipients.
   Phase 1 (studio/foundation) adds the studios / studio_members / orders tables; until then
   there is nothing to remind about, so the cron runs end-to-end and reports 0 studios.
   Query to implement then (Tech §6):
     orders where date = :date and status = 'active'
     join studio_members (owner + manager, users.telegram_id not null, reminders on)
     balance = total - sum(order_payments where deleted_at is null) */
export async function loadDigests(date: string): Promise<StudioDigest[]> {
  void date;
  return [];
}
