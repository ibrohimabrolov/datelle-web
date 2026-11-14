"use client";

import { MONTHS } from "@/lib/dates";
import { eventLabel, eventTone } from "@/lib/studio/calendar";
import { StudioIcon } from "./icons";

export const fmtMoney = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const shortMonth = (iso: string) => {
  const m = MONTHS[Number(iso.slice(5, 7)) - 1];
  return m.length > 4 ? m.slice(0, 3) : m;
};

export type OrderCardData = { id: string; client: string; venue: string | null; eventType: string; balance: number; date: string };

/* Figma OrderCard (Due=Yes / No / Overdue). Overdue = event already passed and money still owed. */
export function OrderCard({ order, today }: { order: OrderCardData; today: string }) {
  const tone = eventTone(order.eventType);
  const meta = [order.venue, eventLabel(order.eventType)].filter(Boolean).join(" · ");
  const overdue = order.balance > 0 && order.date < today;
  return (
    <article className="ds-ordercard">
      <div className="ds-datetile" data-tone={tone} aria-hidden>
        <b>{Number(order.date.slice(8, 10))}</b>
        <small>{shortMonth(order.date)}</small>
      </div>
      <div className="ds-info">
        <strong>{order.client}</strong>
        <span>{meta}</span>
      </div>
      {order.balance > 0 ? (
        <div className="ds-money" data-overdue={overdue || undefined}>
          <b>{fmtMoney(order.balance)}</b>
          <small>{overdue ? "Kechikdi" : "Qoldiq"}</small>
          <span className="ds-sr-only">soʻm</span>
        </div>
      ) : (
        <span className="ds-paid">
          <StudioIcon name="check" size={16} />
          Toʻlangan
        </span>
      )}
    </article>
  );
}
