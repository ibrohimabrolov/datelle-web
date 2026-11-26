"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { MONTHS, todayISO, WD_FULL, weekdayIdx } from "@/lib/dates";
import { eventLabel } from "@/lib/studio/calendar";
import { groupThousands, isOverdue, methodLabel, PAYMENT_METHODS, STATUS_LABEL, type OrderStatus } from "@/lib/studio/orders";
import { Button } from "./Button";
import { reminderLine, RemindDialog, SmetaDialog } from "./ClientDocs";
import { dataChanged, useDataVersion, type OrderFull } from "./data";
import { DateInput, Field, MoneyInput } from "./Fields";
import { StudioIcon } from "./icons";
import { ConfirmDialog, Menu, Modal } from "./Modal";
import { OrderForm } from "./OrderForm";
import { Overlay } from "./Overlay";
import { useStudio } from "./PanelProvider";
import type { ToastMsg } from "./Toast";

type Ev = { id: string; entity: string; action: string; diff: Record<string, unknown> | null; at: string; actor: string | null };

const cap1 = (s: string) => s[0].toUpperCase() + s.slice(1);
const dayLabel = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const whenLabel = (iso: string) => `${cap1(MONTHS[Number(iso.slice(5, 7)) - 1])}, ${WD_FULL[weekdayIdx(iso)]}`;

/* Figma S5 · Buyurtma (panel 480 / mobile page): date + status, client + call/Telegram, balance card,
   payments, ⋯ (Tahrirlash · Bajarildi · Bekor qilish · Tarix), sticky "Toʻlov qoʻshish". */
export function OrderDetail({ id, onClose, toast }: { id: string; onClose(): void; toast(t: ToastMsg): void }) {
  const ctx = useStudio();
  const version = useDataVersion();
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layer, setLayer] = useState<null | "pay" | "edit" | "cancel" | "history" | "smeta" | "remind" | { del: string }>(null);
  const [nonce, setNonce] = useState(0);
  const isOwner = ctx?.studio.role === "owner";

  useEffect(() => {
    let alive = true;
    api<{ order: OrderFull }>(`/api/panel/orders/${id}`)
      .then((r) => alive && (setOrder(r.order), setError(null)))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [id, version, nonce]);

  const status = useCallback(
    async (to: OrderStatus, text: string) => {
      const from = order!.status;
      await api(`/api/panel/orders/${id}/status`, { body: { to } });
      dataChanged();
      toast({ id: Date.now(), text, action: { label: "Bekor qilish", run: () => void api(`/api/panel/orders/${id}/status`, { body: { to: from } }).then(dataChanged) } });
    },
    [id, order, toast],
  );

  if (error && !order)
    return (
      <Overlay title="Buyurtma" onClose={onClose}>
        <div className="ds-stack" role="alert">
          <p className="ds-body-strong">Buyurtmani ochib boʻlmadi</p>
          <p className="ds-body ds-secondary">{error}</p>
          <div>
            <Button variant="secondary" onClick={() => setNonce((n) => n + 1)}>
              Qayta urinish
            </Button>
          </div>
        </div>
      </Overlay>
    );

  if (!order)
    return (
      <Overlay title="Buyurtma" onClose={onClose}>
        <span className="ds-skeleton" style={{ height: 56, width: 220 }} />
        <span className="ds-skeleton" style={{ height: 36, width: 260 }} />
        <span className="ds-skeleton" style={{ height: 180, borderRadius: "var(--ds-radius-xl)" }} />
        <span className="ds-skeleton" style={{ height: 56 }} />
      </Overlay>
    );

  if (layer === "edit")
    return (
      <OrderForm
        initial={order}
        onClose={() => setLayer(null)}
        onSaved={(r) => {
          setLayer(null);
          toast({ id: Date.now(), text: r.warnings.includes("capacity_exceeded") ? "Saqlandi · bu kunda sigʻim toʻlgan" : "Saqlandi" });
        }}
      />
    );

  const today = todayISO();
  const progress = order.total > 0 ? Math.min(1, order.paid / order.total) : 1;
  const state = order.balance < 0 ? "over" : order.balance === 0 ? "paid" : isOverdue(order.date, order.balance, today) ? "overdue" : "due";
  const tgLink = `https://t.me/${order.phone}`; // t.me/+998… opens the chat if the client has Telegram

  const menu = [
    { label: "Tahrirlash", icon: <StudioIcon name="edit" />, onSelect: () => setLayer("edit") },
    ...(order.status === "active"
      ? [{ label: "Bajarildi", icon: <StudioIcon name="check" />, onSelect: () => void status("done", "Bajarildi deb belgilandi").catch(() => toast({ id: Date.now(), text: "Saqlab boʻlmadi" })) }]
      : order.status === "done"
        ? [{ label: "Faolga qaytarish", icon: <StudioIcon name="history" />, onSelect: () => void status("active", "Faolga qaytarildi") }]
        : [{ label: "Tiklash", icon: <StudioIcon name="history" />, onSelect: () => void status("active", "Buyurtma tiklandi") }]),
    { label: "Tarix", icon: <StudioIcon name="history" />, onSelect: () => setLayer("history") },
    ...(order.status === "active" ? [{ label: "Bekor qilish", icon: <StudioIcon name="cross" />, danger: true, onSelect: () => setLayer("cancel") }] : []),
  ];

  if (layer === "history") return <History order={order} onBack={() => setLayer(null)} onClose={onClose} />;

  return (
    <Overlay title="Buyurtma" onClose={onClose} actions={<Menu label="Amallar" items={menu} />}>
      <OrderHead order={order} />

      <div className="ds-client">
        <h3>{order.client}</h3>
        <p className="ds-body ds-secondary">{[order.venue, order.phone.replace(/^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5")].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="ds-two">
        <a className="ds-btn" data-style="secondary" href={`tel:${order.phone}`}>
          <StudioIcon name="phone" variant="Filled" />
          <span>Qoʻngʻiroq</span>
        </a>
        <a className="ds-btn" data-style="secondary" href={tgLink} target="_blank" rel="noreferrer">
          <StudioIcon name="send" variant="Filled" />
          <span>Telegram</span>
        </a>
      </div>

      <section className="ds-balance" data-state={state} aria-label="Pul">
        <span className="ds-caps ds-baltitle">{state === "over" ? "Ortiqcha toʻlov" : state === "paid" ? "Toʻliq toʻlangan" : state === "overdue" ? "Qoldiq · kechikdi" : "Qoldiq"}</span>
        <p className="ds-big">
          <b>{groupThousands(Math.abs(order.balance))}</b>
          <span className="ds-body-medium">soʻm</span>
        </p>
        <div className="ds-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Toʻlangan qism">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <dl>
          <div>
            <dt>Summa</dt>
            <dd>{groupThousands(order.total)}</dd>
          </div>
          <div>
            <dt>Toʻlangan</dt>
            <dd data-paid>{groupThousands(order.paid)}</dd>
          </div>
        </dl>
        {order.lastReminder && order.balance > 0 && <p className="ds-body-sm ds-secondary ds-remind-last">{reminderLine(order.lastReminder)}</p>}
      </section>

      {order.status !== "cancelled" && (
        <div className={order.balance > 0 ? "ds-two" : undefined}>
          <Button variant="secondary" block icon={<StudioIcon name="receipt" />} onClick={() => setLayer("smeta")}>
            Smeta
          </Button>
          {order.balance > 0 && (
            <Button variant="secondary" block icon={<StudioIcon name="wallet" variant="Filled" />} onClick={() => setLayer("remind")}>
              Qoldiqni eslatish
            </Button>
          )}
        </div>
      )}

      <section className="ds-stack" aria-labelledby="pays">
        <h3 id="pays" className="ds-caps ds-tertiary">
          Toʻlovlar · {order.payments.length}
        </h3>
        {order.payments.length === 0 && <p className="ds-body ds-secondary">Hali toʻlov yoʻq</p>}
        {order.payments.map((p) => (
          <div className="ds-payrow" key={p.id}>
            <span className="ds-tile" aria-hidden>
              <StudioIcon name="wallet" variant="Filled" />
            </span>
            <div>
              <span className="ds-body-medium">
                {p.note ?? "Toʻlov"} · {methodLabel(p.method).toLowerCase()}
              </span>
              <span className="ds-body-sm ds-secondary">
                {dayLabel(p.paidOn)}
                {p.by ? ` · ${p.by}` : ""}
              </span>
            </div>
            <b>{groupThousands(p.amount)}</b>
            {isOwner && (
              <button className="ds-iconbtn" data-style="ghost" aria-label={`${groupThousands(p.amount)} soʻm toʻlovni oʻchirish`} onClick={() => setLayer({ del: p.id })}>
                <StudioIcon name="cross" />
              </button>
            )}
          </div>
        ))}
      </section>

      {order.notes && (
        <section className="ds-stack">
          <h3 className="ds-caps ds-tertiary">Izoh</h3>
          <p className="ds-body">{order.notes}</p>
        </section>
      )}

      {order.status !== "cancelled" && (
        <div className="ds-sticky-foot">
          <Button size="l" block icon={<StudioIcon name="plus" />} onClick={() => setLayer("pay")} data-autofocus>
            Toʻlov qoʻshish
          </Button>
        </div>
      )}

      {layer === "pay" && (
        <PaymentDialog
          order={order}
          onClose={() => setLayer(null)}
          onSaved={(r, paymentId) => {
            setLayer(null);
            setOrder(r.order);
            dataChanged();
            toast({
              id: Date.now(),
              text: r.warnings.includes("overpaid") ? "Toʻlov qoʻshildi · ortiqcha toʻlov" : r.order.balance === 0 ? "Toʻlov qoʻshildi · toʻliq toʻlandi" : "Toʻlov qoʻshildi",
              action: { label: "Bekor qilish", run: () => void api(`/api/panel/payments/${paymentId}`, { method: "DELETE", body: {} }).then(dataChanged) },
            });
          }}
        />
      )}
      {layer === "smeta" && (
        <SmetaDialog
          order={order}
          onClose={() => setLayer(null)}
          onSent={(text) => {
            setLayer(null);
            toast({ id: Date.now(), text });
          }}
        />
      )}
      {layer === "remind" && (
        <RemindDialog
          order={order}
          last={order.lastReminder ?? null}
          onClose={() => setLayer(null)}
          onDone={(r, text) => {
            setLayer(null);
            setOrder((o) => o && { ...o, lastReminder: r.lastReminder });
            toast({ id: Date.now(), text });
          }}
        />
      )}
      {layer === "cancel" && (
        <ConfirmDialog
          title="Buyurtmani bekor qilasizmi?"
          description={`${dayLabel(order.date)} boʻshaydi. Toʻlovlar tarixda qoladi.`}
          confirm="Ha, bekor qilish"
          tone="destructive"
          onClose={() => setLayer(null)}
          onConfirm={async () => {
            await status("cancelled", "Buyurtma bekor qilindi");
            setLayer(null);
          }}
        />
      )}
      {layer && typeof layer === "object" && (
        <ConfirmDialog
          title="Toʻlovni oʻchirasizmi?"
          description="Qoldiq qayta hisoblanadi. Yozuv tarixda qoladi."
          confirm="Oʻchirish"
          tone="destructive"
          onClose={() => setLayer(null)}
          onConfirm={async () => {
            const r = await api<{ order: OrderFull }>(`/api/panel/payments/${layer.del}`, { method: "DELETE", body: {} });
            setOrder(r.order);
            setLayer(null);
            dataChanged();
            toast({ id: Date.now(), text: "Toʻlov oʻchirildi" });
          }}
        />
      )}
    </Overlay>
  );
}

/* Figma S5 · Toʻlov qoʻshish (modal 480 / mobile sheet) */
function PaymentDialog({ order, onClose, onSaved }: { order: OrderFull; onClose(): void; onSaved(r: { order: OrderFull; warnings: string[] }, paymentId: string): void }) {
  const [amount, setAmount] = useState<number | null>(order.balance > 0 ? order.balance : null);
  const [method, setMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const after = order.balance - (amount ?? 0);

  return (
    <Modal title="Toʻlov qoʻshish" onClose={onClose}>
      <form
        className="ds-form"
        style={{ gap: "var(--ds-space-16)" }}
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          setErrors({});
          try {
            const r = await api<{ order: OrderFull; warnings: string[] }>(`/api/panel/orders/${order.id}/payments`, { body: { amount: amount ?? 0, method, paidOn } });
            const newest = r.order.payments.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
            onSaved(r, newest.id);
          } catch (e2) {
            if (e2 instanceof ApiError && e2.fields) setErrors(e2.fields);
            else setErr(e2 instanceof ApiError ? e2.message : "Saqlab boʻlmadi");
            setBusy(false);
          }
        }}
      >
        <Field label="Summa" error={errors.amount}>
          {(a) => <MoneyInput {...a} value={amount} onChange={setAmount} data-autofocus placeholder="0" />}
        </Field>
        {order.balance > 0 && (
          <div>
            <button type="button" className="ds-chip-btn" aria-pressed={amount === order.balance} onClick={() => setAmount(order.balance)}>
              Toʻliq qoldiq
            </button>
          </div>
        )}
        <div className="ds-pair">
          <div className="ds-field">
            <span className="ds-label ds-secondary" id="pm-label">
              Usul
            </span>
            <div className="ds-segment" role="radiogroup" aria-labelledby="pm-label" style={{ margin: 0, padding: "var(--ds-space-4)", background: "var(--ds-bg-surface)" }}>
              {PAYMENT_METHODS.map((m) => (
                <button key={m.value} type="button" role="radio" aria-checked={method === m.value} onClick={() => setMethod(m.value)} style={{ height: 36 }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Sana" error={errors.paidOn}>
            {(a) => <DateInput {...a} value={paidOn} max={todayISO()} onChange={setPaidOn} />}
          </Field>
        </div>
        {amount != null && amount > 0 && (
          <p className="ds-label-strong" style={{ color: after < 0 ? "var(--ds-status-info)" : "var(--ds-text-brand)", display: "flex", gap: 6, alignItems: "center" }} aria-live="polite">
            <StudioIcon name="check" size={16} />
            {after === 0 ? "Buyurtma toʻliq toʻlanadi" : after > 0 ? `Qoladi: ${groupThousands(after)} soʻm` : `Ortiqcha: ${groupThousands(-after)} soʻm`}
          </p>
        )}
        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button type="submit" loading={busy} disabled={!amount}>
            Qoʻshish
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function OrderHead({ order }: { order: OrderFull }) {
  return (
    <div className="ds-dayhead">
      <b>{Number(order.date.slice(8, 10))}</b>
      <div>
        <span className="ds-h3">{whenLabel(order.date)}</span>
        <span className="ds-label ds-secondary">
          {eventLabel(order.eventType)}
          {order.guests ? ` · ${order.guests} mehmon` : ""}
        </span>
      </div>
      <span className="ds-status" data-status={order.status}>
        {STATUS_LABEL[order.status]}
      </span>
    </div>
  );
}

/* Figma S5 · Tarix (panel): PanelHeader with Back, the order's day head, events grouped by day (newest first):
   avatar · "<b>Sardor</b> toʻlov qoʻshdi" · detail · time */
const tashkent = (at: string) => new Date(new Date(at).getTime() + 5 * 3_600_000).toISOString(); // shift to UTC+5, read as UTC
function History({ order, onBack, onClose }: { order: OrderFull; onBack(): void; onClose(): void }) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  useEffect(() => {
    let alive = true;
    api<{ events: Ev[] }>(`/api/panel/orders/${order.id}/events`).then((r) => alive && setEvents(r.events)).catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, [order.id]);
  const groups: { day: string; items: Ev[] }[] = [];
  for (const e of events ?? []) {
    const day = tashkent(e.at).slice(0, 10);
    if (groups.at(-1)?.day === day) groups.at(-1)!.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return (
    <Overlay title="Tarix" onBack={onBack} onClose={onClose}>
      <div className="ds-mobile-only">
        <Button variant="ghost" icon={<StudioIcon name="chevron-left" />} onClick={onBack}>
          Buyurtmaga qaytish
        </Button>
      </div>
      <OrderHead order={order} />
      {!events ? (
        <span className="ds-skeleton" style={{ height: 200 }} />
      ) : !events.length ? (
        <p className="ds-body ds-secondary">Hali oʻzgarish yoʻq</p>
      ) : (
        <div className="ds-history">
          {groups.map((g) => (
            <section key={g.day} aria-label={dayLabel(g.day)}>
              <h3 className="ds-caps ds-tertiary">{dayLabel(g.day)}</h3>
              {g.items.map((e) => {
                const { verb, detail } = describe(e);
                const who = e.actor?.trim().split(/\s+/)[0] || "Tizim";
                return (
                  <div className="ds-hrow" key={e.id}>
                    <span className="ds-avatar" aria-hidden>
                      {initials(e.actor ?? "Tizim")}
                    </span>
                    <div>
                      <p>
                        <b>{who}</b> {verb}
                      </p>
                      {detail && <p className="ds-body-sm ds-secondary">{detail}</p>}
                    </div>
                    <time dateTime={e.at}>{tashkent(e.at).slice(11, 16)}</time>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </Overlay>
  );
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const FIELD: Record<string, string> = { clientName: "ismni", clientPhone: "telefonni", eventDate: "sanani", eventType: "tadbir turini", venue: "joyni", guests: "mehmonlar sonini", total: "summani", notes: "izohni" };
const som = (n: unknown) => `${groupThousands(Number(n ?? 0))} soʻm`;
const fieldValue = (k: string, v: unknown) =>
  v == null || v === ""
    ? "—"
    : k === "eventDate"
      ? dayLabel(String(v))
      : k === "total"
        ? som(v)
        : k === "eventType"
          ? eventLabel(String(v))
          : k === "guests"
            ? `${v} mehmon`
            : String(v);
function describe(e: Ev): { verb: string; detail?: string } {
  const d = e.diff ?? {};
  if (e.entity === "payment") {
    const detail = `${som(d.amount)} · ${methodLabel(String(d.method ?? "")).toLowerCase()}`;
    return e.action === "delete" ? { verb: "toʻlovni oʻchirdi", detail } : { verb: "toʻlov qoʻshdi", detail };
  }
  if (e.action === "create") {
    const adv = (d.advance as { amount?: number } | null)?.amount;
    const parts = [d.eventType ? eventLabel(String(d.eventType)) : null, d.venue ? String(d.venue) : null, adv ? `avans ${som(adv)}` : null, d.source === "telegram" ? "Telegram yozishmasidan" : null];
    return { verb: "buyurtma yaratdi", detail: parts.filter(Boolean).join(" · ") || undefined };
  }
  if (e.action === "remind") return { verb: "qoldiqni eslatdi", detail: `${som(d.balance)} · ${d.channel === "sms" ? "SMS" : d.channel === "copy" ? "nusxa" : "Telegram"}` };
  if (e.action === "smeta") return { verb: "smeta yubordi", detail: d.lang === "ru" ? "ruscha" : "oʻzbekcha" };
  if (e.action === "status")
    return { verb: d.to === "done" ? "bajarildi deb belgiladi" : d.to === "cancelled" ? "buyurtmani bekor qildi" : d.from === "cancelled" ? "buyurtmani tikladi" : "faolga qaytardi" };
  if (e.action === "update") {
    const keys = Object.keys(d);
    if (keys.length === 1) {
      const [k] = keys;
      const [from, to] = (d[k] as [unknown, unknown]) ?? [];
      const sensitive = k === "clientPhone" || k === "notes";
      return { verb: `${FIELD[k] ?? k} oʻzgartirdi`, detail: sensitive ? undefined : `${fieldValue(k, from)} → ${fieldValue(k, to)}` };
    }
    return { verb: "buyurtmani tahrirladi", detail: keys.map((k) => (FIELD[k] ?? k).replace(/ni$/, "")).join(", ") };
  }
  return { verb: e.action };
}
