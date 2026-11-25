"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { MONTHS } from "@/lib/dates";
import { reminderText, smsHref } from "@/lib/studio/clientDocs";
import { groupThousands } from "@/lib/studio/orders";
import { Button } from "./Button";
import { StudioIcon } from "./icons";
import { Modal } from "./Modal";
import { useStudio } from "./PanelProvider";

export type RemindOrder = { id: string; date: string; client: string; phone: string; eventType: string; total: number; paid: number; balance: number };

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/* Eslatma yuborish (bulk): the text leaves from the studio's own phone, so this is a queue —
   one tap per client (Telegram copies the text and opens the chat; SMS opens the app), each tap is recorded. */
export function BulkRemind({ orders, onClose, title = "Eslatma yuborish" }: { orders: RemindOrder[]; onClose(): void; title?: string }) {
  const ctx = useStudio();
  const studio = ctx?.studio.name ?? "";
  const due = orders.filter((o) => o.balance > 0).sort((a, b) => a.date.localeCompare(b.date));
  const skipped = orders.length - due.length;
  const [sent, setSent] = useState<Record<string, string>>({});
  const text = (o: RemindOrder) => reminderText({ client: o.client, date: o.date, eventType: o.eventType, total: o.total, paid: o.paid, studio }, "uz");
  const record = (o: RemindOrder, channel: "telegram" | "sms") => {
    setSent((s) => ({ ...s, [o.id]: channel === "telegram" ? "Telegram" : "SMS" }));
    void api(`/api/panel/orders/${o.id}/remind`, { body: { channel, lang: "uz" } }).catch(() => {});
  };
  const viaTelegram = (o: RemindOrder) => {
    void navigator.clipboard?.writeText(text(o)).catch(() => {});
    const url = `https://t.me/${o.phone}`;
    const wa = window.Telegram?.WebApp;
    if (wa?.openTelegramLink) wa.openTelegramLink(url);
    else window.open(url, "_blank", "noopener");
    record(o, "telegram");
  };
  return (
    <Modal
      variant="dialog"
      size="lg"
      title={title}
      description={`${due.length} ta mijozga qoldiq haqida xabar. Telegram matnni nusxalab chatni ochadi — qoʻying va yuboring.${skipped ? ` ${skipped} tasi toʻlangan, oʻtkazib yuborildi.` : ""}`}
      onClose={onClose}
    >
      <ul className="ds-remind-queue">
        {due.map((o) => (
          <li key={o.id} data-done={sent[o.id] ? true : undefined}>
            <span className="ds-avatar" aria-hidden>
              {initials(o.client)}
            </span>
            <span className="ds-remind-who">
              <b>{o.client}</b>
              <span className="ds-body-sm ds-secondary">
                {dayMonth(o.date)} · qoldiq {groupThousands(o.balance)}
              </span>
            </span>
            {sent[o.id] ? (
              <span className="ds-label-strong ds-brand">
                <StudioIcon name="check" size={16} /> {sent[o.id]}
              </span>
            ) : (
              <span className="ds-remind-btns">
                <button className="ds-btn" data-style="secondary" data-size="m" onClick={() => viaTelegram(o)}>
                  <StudioIcon name="send" variant="Filled" />
                  <span>Telegram</span>
                </button>
                <a className="ds-btn" data-style="secondary" data-size="m" href={smsHref(o.phone, text(o))} onClick={() => record(o, "sms")}>
                  <span>SMS</span>
                </a>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="ds-modal-foot">
        <Button variant="secondary" block onClick={onClose}>
          {Object.keys(sent).length >= due.length ? "Tayyor" : "Yopish"}
        </Button>
      </div>
    </Modal>
  );
}
