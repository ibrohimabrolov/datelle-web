"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { DOC_LANGS, reminderText, smsHref, type DocLang } from "@/lib/studio/clientDocs";
import { Button } from "./Button";
import type { OrderFull } from "./data";
import { StudioIcon } from "./icons";
import { Modal } from "./Modal";
import { useStudio } from "./PanelProvider";
import { launchedInTelegram } from "./telegram";

/* Figma S5 · Smeta / Qoldiqni eslatish (modal 480 / mobile sheet).
   Both are client-facing, so both offer the client's language. The reminder is sent from the
   studio's own phone (Telegram chat or SMS) — we only record that it happened. */

export type Reminder = { at: string; channel: string; by: string | null };

const CHANNEL: Record<string, string> = { telegram: "Telegram", sms: "SMS", copy: "nusxa" };
export function agoLabel(iso: string, now = Date.now()) {
  const min = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (min < 2) return "hozirgina";
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.round(h / 24);
  return d === 1 ? "kecha" : `${d} kun oldin`;
}
export const reminderLine = (r: Reminder) => `Eslatildi ${agoLabel(r.at)} · ${CHANNEL[r.channel] ?? r.channel}${r.by ? ` · ${r.by}` : ""}`;

function LangSwitch({ value, onChange }: { value: DocLang; onChange(v: DocLang): void }) {
  return (
    <div className="ds-segment" role="radiogroup" aria-label="Mijoz tili" style={{ alignSelf: "flex-start" }}>
      {DOC_LANGS.map((l) => (
        <button key={l.value} type="button" role="radio" aria-checked={value === l.value} onClick={() => onChange(l.value)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ——— Smeta ——— */
export function SmetaDialog({ order, onClose, onSent }: { order: OrderFull; onClose(): void; onSent(text: string): void }) {
  const [lang, setLang] = useState<DocLang>("uz");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inTelegram = launchedInTelegram();
  const href = `/api/panel/orders/${order.id}/smeta?lang=${lang}`;

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/panel/orders/${order.id}/smeta`, { body: { lang } });
      onSent("Smeta bot chatiga yuborildi — mijozga forward qiling");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Yuborib boʻlmadi. Qayta urinib koʻring.");
      setBusy(false);
    }
  }

  const download = (
    <a className="ds-btn" data-style={inTelegram ? "ghost" : "primary"} data-size="m" href={href} download onClick={() => !inTelegram && onClose()}>
      Yuklab olish
    </a>
  );
  const telegramBtn = (
    <Button variant={inTelegram ? "primary" : "secondary"} icon={<StudioIcon name="send" variant="Filled" />} loading={busy} onClick={send}>
      Telegram’ga yuborish
    </Button>
  );

  return (
    <Modal title="Smeta" onClose={onClose}>
      <div className="ds-form" style={{ gap: "var(--ds-space-16)" }}>
        <p className="ds-body ds-secondary">Bir sahifalik PDF: tadbir, summa, toʻlovlar va qoldiq. Mijozga yuborishga tayyor.</p>
        <LangSwitch value={lang} onChange={setLang} />
        <a className="ds-doc-preview" href={`${href}&inline=1`} target="_blank" rel="noreferrer">
          <StudioIcon name="receipt" size={24} />
          <span>
            <b>Smeta-{order.code}.pdf</b>
            <span className="ds-label ds-secondary">Koʻrish · A4</span>
          </span>
          <StudioIcon name="chevron-right" />
        </a>
        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-modal-foot">
          {inTelegram ? (
            <>
              {download}
              {telegramBtn}
            </>
          ) : (
            <>
              {telegramBtn}
              {download}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ——— Qoldiqni eslatish ——— */
export function RemindDialog({
  order,
  last,
  onClose,
  onDone,
}: {
  order: OrderFull;
  last: Reminder | null;
  onClose(): void;
  onDone(r: { lastReminder: Reminder | null }, text: string): void;
}) {
  const ctx = useStudio();
  const studio = ctx?.studio.name ?? "";
  const make = (l: DocLang) => reminderText({ client: order.client, date: order.date, eventType: order.eventType, total: order.total, paid: order.paid, studio }, l);
  const [lang, setLang] = useState<DocLang>("uz");
  const [text, setText] = useState(() => make("uz"));
  const area = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      area.current?.select();
      return document.execCommand?.("copy") ?? false;
    }
  }
  async function record(channel: "telegram" | "sms" | "copy", toast: string) {
    const r = await api<{ lastReminder: Reminder | null }>(`/api/panel/orders/${order.id}/remind`, { body: { channel, lang } }).catch(() => ({ lastReminder: last }));
    onDone(r, toast);
  }

  function viaTelegram() {
    // open within the same tap (iOS drops popups after an await); the copy runs alongside
    void copy();
    const url = `https://t.me/${order.phone}`;
    const wa = window.Telegram?.WebApp;
    if (wa?.openTelegramLink) wa.openTelegramLink(url);
    else window.open(url, "_blank", "noopener");
    void record("telegram", "Matn nusxalandi — chatga qoʻying va yuboring");
  }

  return (
    <Modal title="Qoldiqni eslatish" onClose={onClose}>
      <div className="ds-form" style={{ gap: "var(--ds-space-16)" }}>
        {last && <p className="ds-label ds-secondary">{reminderLine(last)}</p>}
        <LangSwitch
          value={lang}
          onChange={(l) => {
            setLang(l);
            setText(make(l));
          }}
        />
        <label className="ds-field">
          <span className="ds-label ds-secondary">Xabar · tahrirlash mumkin</span>
          <textarea ref={area} className="ds-input" rows={9} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} data-autofocus />
        </label>
        <div className="ds-remind-actions">
          <Button size="l" block icon={<StudioIcon name="send" variant="Filled" />} onClick={viaTelegram} disabled={!text.trim()}>
            Telegram’da yuborish
          </Button>
          <div className="ds-two">
            <a className="ds-btn" data-style="secondary" data-size="m" href={smsHref(order.phone, text)} onClick={() => void record("sms", "SMS ilovasi ochildi")}>
              SMS
            </a>
            <Button variant="secondary" icon={<StudioIcon name="clipboard-text" />} onClick={async () => (await copy()) && void record("copy", "Matn nusxalandi")}>
              Nusxalash
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
