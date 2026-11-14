import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";
import type { StudioDigest } from "./reminders";

type Row = { studio_id: string; orders: { client: string; place: string | null; balance: number }[]; chat_ids: string[] | null };

/* Tomorrow's active orders per studio + who gets them (Tech §6).
   balance = total − Σ live payments (soft-deleted payments don't count).
   Recipients: owner + managers with a Telegram id and reminders on. Studios without recipients are skipped. */
export async function loadDigests(date: string): Promise<StudioDigest[]> {
  const { rows } = await db.execute<Row>(sql`
    with day_orders as (
      select o.studio_id, o.client_name, o.venue, o.created_at,
             o.total - coalesce((select sum(p.amount) from order_payments p where p.order_id = o.id and p.deleted_at is null), 0) as balance
      from orders o
      where o.event_date = ${date} and o.status = 'active'
    )
    select d.studio_id,
           json_agg(json_build_object('client', d.client_name, 'place', d.venue, 'balance', d.balance) order by d.created_at) as orders,
           (select array_agg(u.telegram_id::text)
              from studio_members m join users u on u.id = m.user_id
              where m.studio_id = d.studio_id and m.reminders_on and u.telegram_id is not null) as chat_ids
    from day_orders d
    group by d.studio_id
  `);
  return rows
    .filter((r) => r.chat_ids?.length)
    .map((r) => ({
      studioId: r.studio_id,
      chatIds: r.chat_ids!.map(Number),
      digest: { date, orders: r.orders.map((o) => ({ ...o, balance: Number(o.balance) })) },
    }));
}
