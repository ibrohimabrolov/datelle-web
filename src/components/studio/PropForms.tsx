"use client";

import { useEffect, useState } from "react";
import { api, ApiError, useToday } from "@/lib/api";
import { dayLabel, WD_SHORT, weekdayIdx } from "@/lib/dates";
import { eventLabel, eventTone } from "@/lib/studio/calendar";
import { PROP_CATEGORIES, propCategory, type PropCategory } from "@/lib/studio/props";
import { Button } from "./Button";
import { dataChanged } from "./data";
import { Field } from "./Fields";
import { StudioIcon } from "./icons";
import { ConfirmDialog, Menu, Modal } from "./Modal";
import { Overlay } from "./Overlay";
import type { ToastMsg } from "./Toast";
import { catIcon, dShort, type PropItem } from "./screens/Rekvizit";

type Booking = { id: string; orderId: string; client: string; venue: string | null; eventType: string; date: string; qty: number; outstanding: number; accounted: number; short: boolean; overdue: boolean };
type Hist = { id: string; action: string; diff: Record<string, unknown> | null; at: string; actor: string | null };
type PropFull = PropItem & { shortages: { date: string; need: number; have: number; missing: number; orders: number }[]; bookings: Booking[]; history: Hist[] };

const SelectChevron = () => <StudioIcon name="chevron-down" size={20} />;
const first = (n: string | null) => (n ?? "").split(" ")[0];
const digits = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 5);
  return d === "" ? null : Number(d);
};

/* Figma S7 · Rekvizit · qoʻshish (modal 480, 495:9677): Nomi · Kategoriya + Soni · Kod (auto) · Izoh · Bekor / Saqlash */
export function PropForm({ item, onClose, onSaved }: { item?: PropItem; onClose(): void; onSaved(p: PropItem, created: boolean): void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<PropCategory>(item?.category ?? "vazalar");
  const [total, setTotal] = useState<number | null>(item?.total ?? null);
  const [code, setCode] = useState(item?.code ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  return (
    <Modal title={item ? "Rekvizitni tahrirlash" : "Rekvizit qoʻshish"} onClose={onClose}>
      <form
        className="ds-form ds-xp-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          setErrors({});
          const payload = { name, category, total: total ?? 0, code: code.trim() || undefined, note };
          try {
            const r = item
              ? await api<{ prop: PropItem }>(`/api/panel/props/${item.id}`, { method: "PATCH", body: payload })
              : await api<{ prop: PropItem }>("/api/panel/props", { body: payload });
            onSaved(r.prop, !item);
          } catch (e2) {
            if (e2 instanceof ApiError && e2.fields) setErrors(e2.fields);
            else setErr(e2 instanceof ApiError ? e2.message : "Saqlab boʻlmadi");
            setBusy(false);
          }
        }}
      >
        <Field label="Nomi" error={errors.name}>
          {(a) => <input {...a} className="ds-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shisha vaza, 40 sm" maxLength={80} data-autofocus />}
        </Field>
        <div className="ds-pair">
          <Field label="Kategoriya" error={errors.category}>
            {(a) => (
              <span className="ds-select ds-xp-select">
                <select {...a} value={category} onChange={(e) => setCategory(e.target.value as PropCategory)}>
                  {PROP_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </span>
            )}
          </Field>
          <Field label="Soni" error={errors.total}>
            {(a) => (
              <div className="ds-affix">
                <input {...a} className="ds-input" inputMode="numeric" autoComplete="off" value={total ?? ""} onChange={(e) => setTotal(digits(e.target.value))} placeholder="0" />
                <span aria-hidden>dona</span>
              </div>
            )}
          </Field>
        </div>
        <Field label="Kod" error={errors.code} hint={item ? undefined : "Boʻsh qoldirsangiz, avtomatik beriladi"}>
          {(a) => <input {...a} className="ds-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={`${propCategory(category).prefix}-01`} maxLength={16} />}
        </Field>
        <Field label="Izoh" error={errors.note}>
          {(a) => <textarea {...a} className="ds-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: 2 tasida kichik tirnalgan joy bor" maxLength={300} />}
        </Field>
        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button type="submit" loading={busy} disabled={name.trim().length < 2 || total == null}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* Figma S7 · Rekvizit · buyum paneli (495:9390): icon + name · Jami / Omborda / Tadbirda · shortage · Band sanalar · Tarix */
export function PropDetail({ id, canDelete, onClose, onEdit, onReturn, toast }: { id: string; canDelete: boolean; onClose(): void; onEdit(p: PropItem): void; onReturn(orderId: string): void; toast(t: ToastMsg): void }) {
  const [p, setP] = useState<PropFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layer, setLayer] = useState<"book" | "repair" | "delete" | null>(null);
  const today = useToday();

  useEffect(() => {
    let alive = true;
    api<{ prop: PropFull }>(`/api/panel/props/${id}`)
      .then((r) => alive && setP(r.prop))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [id]);

  const menu = p
    ? [
        { label: "Tahrirlash", onSelect: () => onEdit(p) },
        ...(p.repair > 0 ? [{ label: `Taʼmirdan qaytdi · ${p.repair}`, onSelect: () => setLayer("repair") }] : []),
        ...(canDelete ? [{ label: "Oʻchirish", danger: true, onSelect: () => setLayer("delete") }] : []),
      ]
    : [];
  const s = p?.shortages[0];

  return (
    <Overlay title="Rekvizit" onClose={onClose} actions={p ? <Menu label="Amallar" items={menu} /> : undefined}>
      {error ? (
        <div className="ds-stack" role="alert">
          <p className="ds-body-strong">Rekvizitni ochib boʻlmadi</p>
          <p className="ds-body ds-secondary">{error}</p>
        </div>
      ) : !p ? (
        <div className="ds-stack" aria-busy>
          <span className="ds-skeleton" style={{ height: 56, width: 280 }} />
          <span className="ds-skeleton" style={{ height: 80, borderRadius: "var(--ds-radius-lg)" }} />
          <span className="ds-skeleton" style={{ height: 220, borderRadius: "var(--ds-radius-lg)" }} />
        </div>
      ) : (
        <>
          <div className="ds-rk-dhead">
            <span className="ds-rk-ic" data-size="l" aria-hidden>
              <StudioIcon name={catIcon(p.category)} variant="Filled" size={24} />
            </span>
            <div>
              <p className="ds-h1">{p.name}</p>
              <p className="ds-body ds-secondary">
                {p.code} · {propCategory(p.category).label}
              </p>
            </div>
          </div>
          <div className="ds-rk-stats">
            <div>
              <b>{p.total}</b>
              <span>Jami</span>
            </div>
            <div>
              <b>{p.stock}</b>
              <span>Omborda</span>
            </div>
            <div data-k="out">
              <b>{p.out + p.overdue}</b>
              <span>Tadbirda</span>
            </div>
          </div>
          {s && (
            <div className="ds-alert" data-tone="warning" role="note">
              <span className="ds-alert-icon ds-rk-tri" aria-hidden>
                <StudioIcon name="alert-triangle" variant="Filled" size={20} />
              </span>
              <div>
                <b>
                  {dShort(s.date)} · {s.missing} ta yetishmaydi
                </b>
                <span>{s.orders > 1 ? `${s.orders} ta tadbir bir kunda: ${s.need} ta kerak, ${s.have} ta bor` : `${s.need} ta kerak, ${s.have} ta bor`}</span>
              </div>
            </div>
          )}
          {p.repair > 0 && (
            <div className="ds-alert" data-tone="info" role="note">
              <span className="ds-alert-icon" aria-hidden>
                !
              </span>
              <div>
                <b>{p.repair} ta taʼmirda</b>
                <span>Tuzatilgach «Taʼmirdan qaytdi» bilan omborga qaytaring</span>
              </div>
            </div>
          )}
          <section className="ds-rk-list" aria-labelledby="rk-dates">
            <div className="ds-rk-listhead">
              <h3 id="rk-dates" className="ds-caps ds-tertiary">
                Band sanalar · {p.bookings.length}
              </h3>
            </div>
            {p.bookings.length === 0 && <p className="ds-body ds-secondary">Hali hech qaysi tadbirga biriktirilmagan</p>}
            {p.bookings.map((b) => {
              const back = b.outstanding > 0 && today !== null && b.date < today; // already left — the row opens the return
              const body = (
                <>
                  <span>
                    <span>{b.client}</span>
                    <span data-alert={b.short || b.overdue || undefined}>
                      {[`${dShort(b.date)}, ${WD_SHORT[weekdayIdx(b.date)].toLowerCase()}`, b.venue, eventLabel(b.eventType)].filter(Boolean).join(" · ")}
                      {b.overdue ? " · qaytmagan" : ""}
                    </span>
                  </span>
                  <b>× {b.accounted > 0 ? `${b.outstanding} / ${b.qty}` : b.qty}</b>
                </>
              );
              return back ? (
                <button key={b.id} type="button" className="ds-rk-row" onClick={() => onReturn(b.orderId)} aria-label={`${b.client}: qaytarishni qabul qilish`}>
                  {body}
                </button>
              ) : (
                <div key={b.id} className="ds-rk-row" data-static>
                  {body}
                </div>
              );
            })}
          </section>
          {p.history.length > 0 && (
            <section className="ds-rk-list" aria-labelledby="rk-hist">
              <h3 id="rk-hist" className="ds-caps ds-tertiary">
                Tarix
              </h3>
              {p.history.slice(0, 8).map((h) => {
                const l = historyLine(h);
                return (
                  <div key={h.id} className="ds-rk-row" data-static>
                    <span>
                      <span>{l.title}</span>
                      <span>{l.meta}</span>
                    </span>
                    <b data-tone={l.tone}>{l.value}</b>
                  </div>
                );
              })}
            </section>
          )}
          <div className="ds-sticky-foot">
            <div className="ds-two">
              <Button variant="secondary" size="l" onClick={() => onEdit(p)}>
                Tahrirlash
              </Button>
              <Button size="l" onClick={() => setLayer("book")} data-autofocus>
                Tadbirga biriktirish
              </Button>
            </div>
          </div>
        </>
      )}
      {layer === "book" && p && (
        <BookDialog
          prop={p}
          onClose={() => setLayer(null)}
          onSaved={(next, warn) => {
            setP(next);
            setLayer(null);
            dataChanged();
            toast({ id: Date.now(), text: warn ?? "Biriktirildi" });
          }}
        />
      )}
      {layer === "repair" && p && (
        <RepairDialog
          prop={p}
          onClose={() => setLayer(null)}
          onSaved={(next, text) => {
            setP(next);
            setLayer(null);
            dataChanged();
            toast({ id: Date.now(), text });
          }}
        />
      )}
      {layer === "delete" && p && (
        <ConfirmDialog
          title={`«${p.name}»ni oʻchirasizmi?`}
          description="Kelgusi tadbirlardagi biriktirishlar ham olib tashlanadi. Tarix saqlanadi."
          confirm="Oʻchirish"
          tone="destructive"
          onClose={() => setLayer(null)}
          onConfirm={async () => {
            try {
              await api(`/api/panel/props/${p.id}`, { method: "DELETE", body: {} });
              dataChanged();
              toast({ id: Date.now(), text: "Rekvizit oʻchirildi" });
              onClose();
            } catch (e) {
              setLayer(null);
              toast({ id: Date.now(), text: e instanceof ApiError ? e.message : "Oʻchirib boʻlmadi" });
            }
          }}
        />
      )}
    </Overlay>
  );
}


function historyLine(h: Hist): { title: string; meta: string; value: string; tone?: "plus" | "minus" } {
  const d = h.diff ?? {};
  const when = dShort(new Date(Date.parse(h.at) + 5 * 3600_000).toISOString().slice(0, 10));
  const who = first(h.actor);
  const num = (k: string) => Number(d[k] ?? 0);
  switch (h.action) {
    case "create":
      return { title: "Qoʻshildi", meta: [when, who].filter(Boolean).join(" · "), value: String(num("total")) };
    case "return": {
      const back = num("back");
      const off = num("broken") + num("lost");
      const parts = [num("broken") ? `${num("broken")} singan` : "", num("lost") ? `${num("lost")} yoʻqolgan` : ""].filter(Boolean).join(", ");
      return { title: off ? `Qaytdi · ${parts}` : "Qaytdi", meta: `${when} · ${String(d.client ?? "")}dan`, value: `+ ${back}`, tone: "plus" };
    }
    case "book":
      return { title: num("qty") ? "Tadbirga biriktirildi" : "Biriktirish olib tashlandi", meta: `${when} · ${String(d.client ?? "")} · ${d.date ? dShort(String(d.date)) : ""}`, value: num("qty") ? `× ${num("qty")}` : "—" };
    case "repaired":
      return { title: "Taʼmirdan qaytdi", meta: [when, who].filter(Boolean).join(" · "), value: `+ ${num("qty")}`, tone: "plus" };
    case "writeoff":
      return { title: "Hisobdan chiqarildi", meta: [when, who && `${who} belgiladi`].filter(Boolean).join(" · "), value: `− ${num("qty")}`, tone: "minus" };
    default: {
      const t = (d.total as [number, number] | undefined) ?? null;
      return { title: t ? "Soni oʻzgardi" : "Tahrirlandi", meta: [when, who].filter(Boolean).join(" · "), value: t ? `${t[0]} → ${t[1]}` : "" };
    }
  }
}

/* Tadbirga biriktirish — not drawn in Figma; built from the Toʻlov qoʻshish modal pattern */
function BookDialog({ prop, onClose, onSaved }: { prop: PropFull; onClose(): void; onSaved(p: PropFull, warning?: string): void }) {
  const [orders, setOrders] = useState<{ id: string; client: string; venue: string | null; date: string }[] | null>(null);
  const [orderId, setOrderId] = useState("");
  const [qty, setQty] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<{ orders: { id: string; client: string; venue: string | null; date: string }[] }>("/api/panel/props/options")
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]));
  }, []);
  const existing = prop.bookings.find((b) => b.orderId === orderId);

  return (
    <Modal title="Tadbirga biriktirish" onClose={onClose}>
      <form
        className="ds-form ds-xp-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          setErrors({});
          try {
            const r = await api<{ prop: PropFull; warnings: string[] }>(`/api/panel/props/${prop.id}/book`, { body: { orderId, qty: qty ?? 0 } });
            onSaved(r.prop, r.warnings[0] ? `Biriktirildi · ${r.warnings[0]}` : undefined);
          } catch (e2) {
            if (e2 instanceof ApiError && e2.fields) setErrors(e2.fields);
            else setErr(e2 instanceof ApiError ? e2.message : "Saqlab boʻlmadi");
            setBusy(false);
          }
        }}
      >
        <p className="ds-body ds-secondary">
          {prop.name} · omborda {prop.stock} / {prop.total}
        </p>
        <Field label="Tadbir" error={errors.orderId}>
          {(a) => (
            <span className="ds-select ds-xp-select">
              <select
                {...a}
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  const b = prop.bookings.find((x) => x.orderId === e.target.value);
                  if (b) setQty(b.qty);
                }}
                disabled={!orders}
                data-autofocus
              >
                <option value="">Tadbirni tanlang</option>
                {(orders ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {[dayLabel(o.date), o.client, o.venue].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </span>
          )}
        </Field>
        <Field label="Soni" error={errors.qty} hint={existing ? `Hozir ${existing.qty} ta biriktirilgan · 0 — olib tashlash` : undefined}>
          {(a) => (
            <div className="ds-affix">
              <input {...a} className="ds-input" inputMode="numeric" autoComplete="off" value={qty ?? ""} onChange={(e) => setQty(digits(e.target.value))} placeholder="0" />
              <span aria-hidden>dona</span>
            </div>
          )}
        </Field>
        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button type="submit" loading={busy} disabled={!orderId || qty == null || (!existing && qty === 0)}>
            Biriktirish
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RepairDialog({ prop, onClose, onSaved }: { prop: PropFull; onClose(): void; onSaved(p: PropFull, text: string): void }) {
  const [n, setN] = useState(prop.repair);
  const [busy, setBusy] = useState(false);
  const send = async (writeOff: boolean) => {
    setBusy(true);
    const r = await api<{ prop: PropFull }>(`/api/panel/props/${prop.id}/repair`, { body: { fixed: n, writeOff } });
    onSaved(r.prop, writeOff ? `${n} ta hisobdan chiqarildi` : `${n} ta omborga qaytdi`);
  };
  return (
    <Modal title="Taʼmirdan qaytdi" onClose={onClose} size="sm">
      <div className="ds-form ds-xp-form">
        <p className="ds-body ds-secondary">
          {prop.name}: {prop.repair} ta taʼmirda. Nechtasi tayyor?
        </p>
        <div className="ds-stepper" data-size="s" role="group" aria-label="Soni" style={{ alignSelf: "flex-start" }}>
          <button type="button" onClick={() => setN((v) => Math.max(1, v - 1))} disabled={n <= 1} aria-label="Kamaytirish">
            <StudioIcon name="minus" />
          </button>
          <output aria-live="polite">{n}</output>
          <button type="button" onClick={() => setN((v) => Math.min(prop.repair, v + 1))} disabled={n >= prop.repair} aria-label="Koʻpaytirish">
            <StudioIcon name="plus" />
          </button>
        </div>
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={() => send(true)} disabled={busy}>
            Tuzalmaydi — hisobdan chiqarish
          </Button>
          <Button onClick={() => send(false)} loading={busy} data-autofocus>
            Omborga qaytarish
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* Figma S7 · Rekvizit · qaytarishni qabul qilish (495:9913): per item stepper; a shortfall needs a reason */
type Reason = "broken" | "lost" | "later";
export function ReturnPanel({ orderId, onClose, onDone }: { orderId: string; onClose(): void; onDone(back: number): void }) {
  const [data, setData] = useState<{ order: { client: string; venue: string | null; date: string; eventType: string }; lines: { id: string; name: string; outstanding: number }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [back, setBack] = useState<Record<string, number>>({});
  const [why, setWhy] = useState<Record<string, Reason>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api<NonNullable<typeof data>>(`/api/panel/props/returns/${orderId}`)
      .then((r) => {
        if (!alive) return;
        setData(r);
        setBack(Object.fromEntries(r.lines.map((l) => [l.id, l.outstanding])));
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [orderId]);

  const today = useToday() ?? "";
  const late = data && today ? Math.round((Date.parse(today) - Date.parse(data.order.date)) / 86_400_000) - 1 : 0;
  const total = data?.lines.reduce((s, l) => s + l.outstanding, 0) ?? 0;
  const got = data?.lines.reduce((s, l) => s + (back[l.id] ?? 0), 0) ?? 0;
  const missing = (data?.lines ?? []).filter((l) => (back[l.id] ?? 0) < l.outstanding);
  const toRepair = missing.filter((l) => why[l.id] === "broken").reduce((s, l) => s + l.outstanding - (back[l.id] ?? 0), 0);
  const ready = missing.every((l) => why[l.id]);

  return (
    <Overlay title="Qaytarishni qabul qilish" onClose={onClose}>
      {error ? (
        <p className="ds-alert" role="alert">
          {error}
        </p>
      ) : !data ? (
        <div className="ds-stack" aria-busy>
          <span className="ds-skeleton" style={{ height: 80, width: 260 }} />
          <span className="ds-skeleton" style={{ height: 200, borderRadius: "var(--ds-radius-lg)" }} />
        </div>
      ) : (
        <>
          <div className="ds-xp-dhead">
            <span className="ds-xp-pill ds-rk-evpill" data-tone={eventTone(data.order.eventType)}>
              {eventLabel(data.order.eventType)}
            </span>
            <p className="ds-h1">{data.order.client}</p>
            <p className="ds-body ds-secondary">{[data.order.venue, dShort(data.order.date), `${total} buyum`].filter(Boolean).join(" · ")}</p>
          </div>
          {late > 0 && (
            <div className="ds-alert" data-tone="danger" role="note">
              <span className="ds-alert-icon" aria-hidden>
                !
              </span>
              <div>
                <b>{late} kun kechikdi</b>
                <span>Qaytish sanasi {dShort(addOne(data.order.date))} edi.</span>
              </div>
            </div>
          )}
          {data.lines.length === 0 ? (
            <p className="ds-body ds-secondary">Bu buyurtmadan qaytishi kerak boʻlgan buyum yoʻq.</p>
          ) : (
            <section className="ds-rk-list" aria-labelledby="rk-ret">
              <h3 id="rk-ret" className="ds-caps ds-tertiary">
                Buyumlar · qaytdi / kutilgan
              </h3>
              {data.lines.map((l) => {
                const v = back[l.id] ?? 0;
                const short = l.outstanding - v;
                return (
                  <div key={l.id} className="ds-rk-ret">
                    <div className="r-line">
                      <span>
                        <span className="ds-body-medium">{l.name}</span>
                        <span className="ds-body-sm" data-short={short > 0 || undefined}>
                          {short > 0 ? `${short} ta kam — sababini belgilang` : "Hammasi joyida"}
                        </span>
                      </span>
                      <div className="ds-stepper ds-rk-stepper" role="group" aria-label={`${l.name}: qaytgani`}>
                        <button type="button" onClick={() => setBack((b) => ({ ...b, [l.id]: Math.max(0, v - 1) }))} disabled={v <= 0} aria-label="Kamaytirish">
                          <StudioIcon name="minus" />
                        </button>
                        <output aria-live="polite">
                          {v} / {l.outstanding}
                        </output>
                        <button type="button" onClick={() => setBack((b) => ({ ...b, [l.id]: Math.min(l.outstanding, v + 1) }))} disabled={v >= l.outstanding} aria-label="Koʻpaytirish">
                          <StudioIcon name="plus" />
                        </button>
                      </div>
                    </div>
                    {short > 0 && (
                      <div className="ds-chips" role="radiogroup" aria-label={`${l.name}: sabab`}>
                        {(
                          [
                            ["broken", "Singan"],
                            ["lost", "Yoʻqolgan"],
                            ["later", "Keyin qaytadi"],
                          ] as const
                        ).map(([k, label]) => (
                          <button key={k} type="button" role="radio" className="ds-chip-btn" aria-checked={why[l.id] === k} onClick={() => setWhy((w) => ({ ...w, [l.id]: k }))}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="ds-rk-sum">
                <span>
                  <span className="ds-label ds-secondary">Omborga qaytadi</span>
                  <b>
                    {got} / {total}
                  </b>
                </span>
                {toRepair > 0 && <span className="ds-label">{toRepair} ta taʼmirga</span>}
              </div>
            </section>
          )}
          <div className="ds-sticky-foot">
            <Button
              size="l"
              block
              loading={busy}
              disabled={!data.lines.length || !ready}
              onClick={async () => {
                setBusy(true);
                const lines = data.lines.map((l) => {
                  const v = back[l.id] ?? 0;
                  const rest = l.outstanding - v;
                  return { bookingId: l.id, back: v, broken: why[l.id] === "broken" ? rest : 0, lost: why[l.id] === "lost" ? rest : 0 };
                });
                try {
                  await api(`/api/panel/props/returns/${orderId}`, { body: { lines } });
                  onDone(got);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : "Saqlab boʻlmadi");
                  setBusy(false);
                }
              }}
            >
              Qabul qilish
            </Button>
          </div>
        </>
      )}
    </Overlay>
  );
}

const addOne = (iso: string) => new Date(Date.parse(iso) + 86_400_000).toISOString().slice(0, 10);
