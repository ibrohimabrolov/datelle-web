"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { addDays, MONTHS, todayISO, WD_FULL, weekdayIdx } from "@/lib/dates";
import { freeSlots, STUDIO_EVENTS } from "@/lib/studio/calendar";
import { groupThousands } from "@/lib/studio/orders";
import { Button } from "./Button";
import { dataChanged, fetchMonth, monthCache, monthKey, type OrderFull } from "./data";
import { Field, formatPhone, MoneyInput, PhoneInput } from "./Fields";
import { ConfirmDialog } from "./Modal";
import { Overlay } from "./Overlay";
import { useStudio } from "./PanelProvider";

/* Figma S5 · Yangi buyurtma / Tahrirlash. Groups Mijoz · Tadbir · Pul, live "Qoldiq",
   capacity of the chosen day, unsaved-changes guard. Server-confirmed save, then every screen refetches. */

const CHIP_EVENTS = ["toy", "qiz-uzatar", "tugilgan-kun", "boshqa"];
const dateHint = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}, ${WD_FULL[weekdayIdx(iso)]}`;

type Form = { clientName: string; clientPhone: string; eventDate: string; eventType: string; guests: string; venue: string; notes: string; total: number | null; advance: number | null };

export type SavedOrder = { order: OrderFull; warnings: string[] };

export function OrderForm({ initial, date, onClose, onSaved }: { initial?: OrderFull; date?: string; onClose(): void; onSaved(r: SavedOrder): void }) {
  const ctx = useStudio();
  const edit = Boolean(initial);
  const start: Form = useMemo(
    () => ({
      clientName: initial?.client ?? "",
      clientPhone: initial ? formatPhone(initial.phone) : "",
      eventDate: initial?.date ?? date ?? addDays(todayISO(), 1),
      eventType: initial?.eventType ?? "toy",
      guests: initial?.guests ? String(initial.guests) : "",
      venue: initial?.venue ?? "",
      notes: initial?.notes ?? "",
      total: initial?.total ?? null,
      advance: null,
    }),
    [initial, date],
  );
  const [f, setF] = useState<Form>(start);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [guard, setGuard] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k] || (k === "advance" && errors["advance.amount"]))
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        if (k === "advance") delete next["advance.amount"];
        return next;
      });
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(start);

  // capacity of the chosen day, from the calendar month cache (fetched if missing)
  const studioId = ctx?.studio.id;
  const month = f.eventDate.slice(0, 7);
  const [monthVersion, setMonthVersion] = useState(0);
  useEffect(() => {
    if (!studioId || monthCache.has(monthKey(studioId, month))) return;
    let alive = true;
    fetchMonth(studioId, month)
      .then(() => alive && setMonthVersion((n) => n + 1))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [studioId, month]);
  const day = useMemo(() => {
    void monthVersion;
    if (!studioId) return null;
    const m = monthCache.get(monthKey(studioId, month));
    if (!m) return null;
    const d = m.days.find((x) => x.date === f.eventDate);
    const load = (d?.orders ?? []).filter((o) => o.id !== initial?.id).length;
    return { load, blocked: Boolean(d?.blocked), capacity: m.capacity };
  }, [studioId, month, f.eventDate, initial?.id, monthVersion]);

  const balance = (f.total ?? 0) - (edit ? (initial?.paid ?? 0) : (f.advance ?? 0));
  const events = CHIP_EVENTS.includes(f.eventType) ? CHIP_EVENTS : [...CHIP_EVENTS, f.eventType];

  async function submit() {
    setSaving(true);
    setFormError(null);
    setErrors({});
    const payload = {
      clientName: f.clientName,
      clientPhone: f.clientPhone,
      eventDate: f.eventDate,
      eventType: f.eventType,
      venue: f.venue,
      guests: f.guests ? Number(f.guests) : null,
      notes: f.notes,
      total: f.total ?? undefined,
      ...(!edit && f.advance ? { advance: { amount: f.advance, method: "cash" } } : {}),
    };
    try {
      const r = edit
        ? await api<SavedOrder>(`/api/panel/orders/${initial!.id}`, { method: "PATCH", body: payload })
        : await api<SavedOrder>("/api/panel/orders", { body: payload });
      dataChanged();
      onSaved(r);
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      else setFormError(e instanceof ApiError ? e.message : "Saqlab boʻlmadi. Qayta urinib koʻring.");
      setSaving(false);
    }
  }

  const close = () => (dirty && !saving ? setGuard(true) : onClose());

  return (
    <Overlay title={edit ? "Tahrirlash" : "Yangi buyurtma"} onClose={close}>
      <h2 className="ds-h2 ds-mobile-only">{edit ? "Tahrirlash" : "Yangi buyurtma"}</h2>
      <form
        className="ds-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <section aria-labelledby="f-client">
          <h3 id="f-client" className="ds-caps ds-tertiary">
            Mijoz
          </h3>
          <div className="ds-pair">
            <Field label="Ism" error={errors.clientName}>
              {(a) => <input {...a} className="ds-input" value={f.clientName} onChange={(e) => set("clientName", e.target.value)} autoComplete="off" placeholder="Masalan, Malika Karimova" data-autofocus maxLength={80} />}
            </Field>
            <Field label="Telefon" error={errors.clientPhone}>
              {(a) => <PhoneInput {...a} value={f.clientPhone} onChange={(v) => set("clientPhone", v)} />}
            </Field>
          </div>
        </section>

        <section aria-labelledby="f-event">
          <h3 id="f-event" className="ds-caps ds-tertiary">
            Tadbir
          </h3>
          <div className="ds-pair">
            <Field label="Sana" error={errors.eventDate} hint={dateHint(f.eventDate)}>
              {(a) => (
                <input
                  {...a}
                  className="ds-input"
                  type="date"
                  value={f.eventDate}
                  min={addDays(todayISO(), -730)}
                  max={addDays(todayISO(), 730)}
                  onChange={(e) => e.target.value && set("eventDate", e.target.value)}
                />
              )}
            </Field>
            <Field label="Mehmonlar · ixtiyoriy" error={errors.guests}>
              {(a) => <input {...a} className="ds-input" inputMode="numeric" value={f.guests} onChange={(e) => set("guests", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="120" />}
            </Field>
          </div>
          {day && (
            <DayCapacity load={day.load} capacity={day.capacity} blocked={day.blocked} />
          )}
          <div className="ds-chips" role="radiogroup" aria-label="Tadbir turi">
            {events.map((slug) => (
              <button key={slug} type="button" role="radio" className="ds-chip-btn" aria-checked={f.eventType === slug} onClick={() => set("eventType", slug)}>
                {STUDIO_EVENTS.find((e) => e.slug === slug)?.label ?? slug}
              </button>
            ))}
          </div>
          {errors.eventType && (
            <p className="ds-helper" data-error>
              {errors.eventType}
            </p>
          )}
          <Field label="Joy" error={errors.venue}>
            {(a) => <input {...a} className="ds-input" value={f.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Toʻyxona yoki manzil" maxLength={120} />}
          </Field>
          <Field label="Izoh · ixtiyoriy" error={errors.notes}>
            {(a) => <textarea {...a} className="ds-input" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ranglar, istaklar" maxLength={500} />}
          </Field>
        </section>

        <section aria-labelledby="f-money">
          <h3 id="f-money" className="ds-caps ds-tertiary">
            Pul
          </h3>
          <div className="ds-pair">
            <Field label="Summa" error={errors.total}>
              {(a) => <MoneyInput {...a} value={f.total} onChange={(v) => set("total", v)} placeholder="0" />}
            </Field>
            {!edit && (
              <Field label="Avans · ixtiyoriy" error={errors["advance.amount"]}>
                {(a) => <MoneyInput {...a} value={f.advance} onChange={(v) => set("advance", v)} placeholder="0" />}
              </Field>
            )}
          </div>
          {f.total != null && (
            <p className="ds-due-line" data-zero={balance <= 0 || undefined} aria-live="polite">
              <span>{balance < 0 ? "Ortiqcha" : "Qoldiq"}</span>
              <b>{groupThousands(Math.abs(balance))} soʻm</b>
            </p>
          )}
        </section>

        {formError && (
          <p className="ds-alert" role="alert">
            {formError}
          </p>
        )}

        <div className="ds-sticky-foot">
          <Button type="submit" size="l" block loading={saving} disabled={edit && !dirty}>
            Saqlash
          </Button>
        </div>
      </form>

      {guard && (
        <ConfirmDialog
          title="Oʻzgarishlar saqlanmasinmi?"
          description="Kiritgan maʼlumotlaringiz yoʻqoladi."
          confirm="Chiqish"
          tone="destructive"
          onClose={() => setGuard(false)}
          onConfirm={() => {
            setGuard(false);
            onClose();
          }}
        />
      )}
    </Overlay>
  );
}

/* Capacity of the chosen day — warns, never blocks (Tech §2) */
function DayCapacity({ load, capacity, blocked }: { load: number; capacity: number; blocked: boolean }) {
  if (blocked) return <p className="ds-alert" data-tone="warning">Bu kun yopiq. Saqlasangiz ham buyurtma qoʻshiladi.</p>;
  const free = freeSlots(load, capacity);
  if (free === 0) return <p className="ds-alert" data-tone="warning">Bu kunda sigʻim toʻlgan ({load}/{capacity}). Saqlasangiz ham qoʻshiladi.</p>;
  const status = free === 1 && capacity > 1 ? "limited" : "has";
  return (
    <span className="ds-capmeter" data-status={status} style={{ marginTop: -8 }}>
      {capacity <= 6 && (
        <span aria-hidden>
          {Array.from({ length: capacity }, (_, i) => (
            <i key={i} data-used={i < load || undefined} />
          ))}
        </span>
      )}
      {free} joy boʻsh
    </span>
  );
}
