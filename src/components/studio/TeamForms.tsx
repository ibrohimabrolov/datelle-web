"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { dayLabel, WD_SHORT, weekdayIdx } from "@/lib/dates";
import { eventLabel, eventTone } from "@/lib/studio/calendar";
import { groupThousands } from "@/lib/studio/orders";
import { initials, kindLabel, LONG_DAY_H, overlaps, span, STAFF_ROLES, TASK_KINDS, toMin, type TaskKind } from "@/lib/studio/team";
import { Button } from "./Button";
import { Field, formatPhone, PhoneInput } from "./Fields";
import { StudioIcon } from "./icons";
import { ConfirmDialog, Menu, Modal } from "./Modal";
import { Overlay } from "./Overlay";
import type { ToastMsg } from "./Toast";
import { dShort, timeRange, weekHours, weekLabel, type Layer, type Staff, type Task, type Week } from "./screens/Jadval";

const SelectChevron = () => <StudioIcon name="chevron-down" size={20} />;
type OrderOpt = { id: string; client: string; venue: string | null; date: string };
type TaskFull = {
  id: string; orderId: string | null; kind: TaskKind; day: string; startsAt: string; endsAt: string | null; place: string | null; note: string | null;
  order: { client: string; venue: string | null; eventType: string; date: string; total: number; balance: number } | null;
  staff: { id: string; name: string; role: string }[];
  props: { name: string; code: string; qty: number }[];
};

/* ── Xodim qoʻshish / tahrirlash (not drawn in Figma; Toʻlov modal pattern) ── */
export function StaffForm({ staff, onClose, onSaved }: { staff?: Staff; onClose(): void; onSaved(s: Staff, created: boolean): void }) {
  const [name, setName] = useState(staff?.name ?? "");
  const [role, setRole] = useState(staff?.role ?? "");
  const [phone, setPhone] = useState(staff?.phone ? formatPhone(staff.phone) : "");
  const [telegram, setTelegram] = useState(staff?.telegram ?? "");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title={staff ? "Xodimni tahrirlash" : "Xodim qoʻshish"} onClose={onClose}>
      <form
        className="ds-form ds-xp-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          setErrors({});
          const payload = { name, role, phone: phone || null, telegram: telegram || null };
          try {
            const r = staff
              ? await api<{ staff: Staff }>(`/api/panel/schedule/staff/${staff.id}`, { method: "PATCH", body: payload })
              : await api<{ staff: Staff }>("/api/panel/schedule/staff", { body: payload });
            onSaved(r.staff, !staff);
          } catch (e2) {
            if (e2 instanceof ApiError && e2.fields) setErrors(e2.fields);
            else setErr(e2 instanceof ApiError ? e2.message : "Saqlab boʻlmadi");
            setBusy(false);
          }
        }}
      >
        <Field label="Ism" error={errors.name}>
          {(a) => <input {...a} className="ds-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dilshod Rahimov" maxLength={80} data-autofocus />}
        </Field>
        <Field label="Roli" error={errors.role}>
          {(a) => (
            <>
              <input {...a} className="ds-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Florist" maxLength={40} list="jj-roles" />
              <datalist id="jj-roles">
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <div className="ds-pair">
          <Field label="Telefon" error={errors.phone}>
            {(a) => <PhoneInput {...a} value={phone} onChange={setPhone} />}
          </Field>
          <Field label="Telegram" error={errors.telegram}>
            {(a) => <input {...a} className="ds-input" value={telegram} onChange={(e) => setTelegram(e.target.value.replace(/\s/g, ""))} placeholder="@username" maxLength={33} />}
          </Field>
        </div>
        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button type="submit" loading={busy} disabled={name.trim().length < 2 || role.trim().length < 2}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── S8 · Jamoa jadvali · odam biriktirish (modal, 498:10335) — also creates and edits a job ── */
export function TaskForm({ taskId, presetStaff, staff, onClose, onSaved }: { taskId?: string; presetStaff?: string[]; staff: Staff[]; onClose(): void; onSaved(id: string, people: number, created: boolean): void }) {
  const [task, setTask] = useState<TaskFull | null>(null);
  const [orders, setOrders] = useState<OrderOpt[] | null>(null);
  const [orderId, setOrderId] = useState("");
  const [kind, setKind] = useState<TaskKind>("montaj");
  const [day, setDay] = useState("");
  const [startsAt, setStartsAt] = useState("09:00");
  const [endsAt, setEndsAt] = useState("");
  const [place, setPlace] = useState("");
  const [picked, setPicked] = useState<string[]>(presetStaff ?? []);
  const [busyWeek, setBusyWeek] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (taskId) {
      api<{ task: TaskFull }>(`/api/panel/schedule/tasks/${taskId}`)
        .then(({ task: t }) => {
          if (!alive) return;
          setTask(t);
          setOrderId(t.orderId ?? "");
          setKind(t.kind);
          setDay(t.day);
          setStartsAt(t.startsAt);
          setEndsAt(t.endsAt ?? "");
          setPlace(t.place ?? "");
          setPicked(t.staff.map((s) => s.id));
        })
        .catch((e) => alive && setErr(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    } else {
      api<{ orders: OrderOpt[] }>("/api/panel/props/options")
        .then((r) => alive && setOrders(r.orders))
        .catch(() => alive && setOrders([]));
    }
    return () => {
      alive = false;
    };
  }, [taskId]);

  // the day's other jobs → who is busy (fetches the week around the chosen day)
  useEffect(() => {
    if (!day) return;
    let alive = true;
    api<Week>(`/api/panel/schedule?week=${day}`)
      .then((w) => alive && setBusyWeek(w.tasks))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [day]);

  const me = { day, startsAt, endsAt: endsAt || null };
  const clash = (sid: string) => (day ? busyWeek.find((t) => t.id !== taskId && t.staffIds.includes(sid) && overlaps(me, t)) : undefined);
  const sameDay = (sid: string) => busyWeek.filter((t) => t.id !== taskId && t.day === day && t.staffIds.includes(sid));
  const nextDay = endsAt && toMin(endsAt) <= toMin(startsAt);

  return (
    <Modal title={taskId ? "Odam biriktirish" : "Vazifa qoʻshish"} onClose={onClose}>
      <form
        className="ds-form ds-xp-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          setErrors({});
          const payload = { orderId: orderId || null, kind, day, startsAt, endsAt: endsAt || null, place: place || null, staffIds: picked };
          try {
            const r = taskId
              ? await api<{ task: TaskFull }>(`/api/panel/schedule/tasks/${taskId}`, { method: "PATCH", body: payload })
              : await api<{ task: TaskFull }>("/api/panel/schedule/tasks", { body: payload });
            onSaved(r.task.id, picked.length, !taskId);
          } catch (e2) {
            if (e2 instanceof ApiError && e2.fields) setErrors(e2.fields);
            else setErr(e2 instanceof ApiError ? e2.message : "Saqlab boʻlmadi");
            setBusy(false);
          }
        }}
      >
        {taskId ? (
          task?.order ? (
            <div className="ds-jj-ctx">
              <span>
                <b>{[task.order.client, task.order.venue].filter(Boolean).join(" · ")}</b>
                <span>
                  {dayLabel(task.order.date)} · {eventLabel(task.order.eventType)}
                </span>
              </span>
              <span className="ds-xp-pill ds-rk-evpill" data-tone={eventTone(task.order.eventType)}>
                {eventLabel(task.order.eventType)}
              </span>
            </div>
          ) : null
        ) : (
          <>
            <Field label="Buyurtma" error={errors.orderId} hint="Ustaxonadagi ish boʻlsa ham tanlang — jadvalda rangi shu tadbirniki boʻladi">
              {(a) => (
                <span className="ds-select ds-xp-select">
                  <select
                    {...a}
                    value={orderId}
                    disabled={!orders}
                    data-autofocus
                    onChange={(e) => {
                      setOrderId(e.target.value);
                      const o = orders?.find((x) => x.id === e.target.value);
                      if (o) {
                        setDay(o.date);
                        if (!place) setPlace(o.venue ?? "");
                      }
                    }}
                  >
                    <option value="">Buyurtmasiz vazifa</option>
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
          </>
        )}

        <div className="ds-field">
          <span className="ds-label ds-secondary" id="jj-kind">
            Vazifa
          </span>
          <div className="ds-chips" role="radiogroup" aria-labelledby="jj-kind">
            {TASK_KINDS.map((k) => (
              <button key={k.slug} type="button" role="radio" className="ds-chip-btn" aria-checked={kind === k.slug} onClick={() => setKind(k.slug)}>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ds-jj-times">
          <Field label="Sana" error={errors.day}>
            {(a) => <input {...a} className="ds-input" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />}
          </Field>
          <Field label="Boshlanishi" error={errors.startsAt}>
            {(a) => <input {...a} className="ds-input" type="time" value={startsAt} onChange={(e) => e.target.value && setStartsAt(e.target.value)} />}
          </Field>
          <Field label="Tugashi" error={errors.endsAt} hint={nextDay ? "Ertasi kuni" : undefined}>
            {(a) => <input {...a} className="ds-input" type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />}
          </Field>
        </div>
        <Field label="Joy" error={errors.place}>
          {(a) => <input {...a} className="ds-input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Toʻyxona yoki Ustaxona" maxLength={120} />}
        </Field>

        <section className="ds-jj-pick" aria-labelledby="jj-who">
          <h3 id="jj-who" className="ds-caps ds-tertiary">
            Kim boradi · {picked.length} tanlandi
          </h3>
          {staff.length === 0 && <p className="ds-body ds-secondary">Avval xodim qoʻshing — keyin shu yerda tanlaysiz.</p>}
          {staff.map((s) => {
            const c = clash(s.id);
            const others = sameDay(s.id);
            const on = picked.includes(s.id);
            return (
              <label key={s.id} className="ds-jj-pickrow" data-busy={(c && !on) || undefined}>
                <span className="ds-checkbox">
                  <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))} aria-label={s.name} />
                  <span aria-hidden>
                    <StudioIcon name="check" size={16} />
                  </span>
                </span>
                <span className="ds-jj-avatar" aria-hidden>
                  {initials(s.name)}
                </span>
                <span className="r-who">
                  <span>{s.name}</span>
                  <span data-warn={c ? "" : undefined}>
                    {c ? `${c.startsAt} da ${[c.place, kindLabel(c.kind).toLowerCase()].filter(Boolean).join("da ")}` : [s.role, others.length ? `shu kuni ${others.map((o) => `${o.startsAt} ${o.place ?? ""}`.trim()).join(", ")}` : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="ds-jj-free" data-busy={c ? "" : undefined}>
                  {c ? "Band" : "Boʻsh"}
                </span>
              </label>
            );
          })}
        </section>

        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button type="submit" loading={busy} disabled={!day || (Boolean(taskId) && !task)}>
            {picked.length ? `Biriktirish · ${picked.length}` : "Saqlash"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── S8 · Jamoa jadvali · vazifa paneli (496:10967) ── */
export function TaskPanel({ id, onClose, open, toast, onRemoved }: { id: string; onClose(): void; open(l: Layer): void; toast(t: ToastMsg): void; onRemoved(): void }) {
  const [t, setT] = useState<TaskFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    let alive = true;
    api<{ task: TaskFull }>(`/api/panel/schedule/tasks/${id}`)
      .then((r) => alive && setT(r.task))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [id]);

  const message = t
    ? [`${kindLabel(t.kind)} · ${dayLabel(t.day)}, ${timeRange(t)}`, t.place && `Joy: ${t.place}`, t.order && `Mijoz: ${t.order.client}`, t.props.length ? `Rekvizit: ${t.props.map((p) => `${p.name} × ${p.qty}`).join(", ")}` : "", t.note && `Izoh: ${t.note}`]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <Overlay title="Vazifa" onClose={onClose} actions={t ? <Menu label="Amallar" items={[{ label: "Tahrirlash", onSelect: () => open({ kind: "task-edit", id }) }, { label: "Oʻchirish", danger: true, onSelect: () => setConfirm(true) }]} /> : undefined}>
      {error ? (
        <p className="ds-alert" role="alert">
          {error}
        </p>
      ) : !t ? (
        <div className="ds-stack" aria-busy>
          <span className="ds-skeleton" style={{ height: 80, width: 260 }} />
          <span className="ds-skeleton" style={{ height: 220, borderRadius: "var(--ds-radius-lg)" }} />
        </div>
      ) : (
        <>
          <div className="ds-xp-dhead">
            {t.order && (
              <span className="ds-xp-pill ds-rk-evpill" data-tone={eventTone(t.order.eventType)}>
                {eventLabel(t.order.eventType)}
              </span>
            )}
            <p className="ds-h1">{kindLabel(t.kind)}</p>
            <p className="ds-body ds-secondary">
              {dayLabel(t.day)} · {timeRange(t)}
            </p>
          </div>
          <dl className="ds-xp-info">
            <div>
              <dt>Joy</dt>
              <dd>{t.place ?? "—"}</dd>
            </div>
            {t.order && (
              <>
                <div>
                  <dt>Mijoz</dt>
                  <dd>{t.order.client}</dd>
                </div>
                <div>
                  <dt>Buyurtma</dt>
                  <dd data-due={t.order.balance > 0 ? "" : undefined}>
                    {groupThousands(t.order.total)} soʻm{t.order.balance > 0 ? " · qoldiq bor" : " · toʻlangan"}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <section className="ds-rk-list" aria-labelledby="jj-crew">
            <div className="ds-jj-listhead">
              <h3 id="jj-crew" className="ds-caps ds-tertiary">
                Jamoa · {t.staff.length}
              </h3>
              <button type="button" className="ds-xp-link" onClick={() => open({ kind: "task-edit", id })}>
                Odam qoʻshish
              </button>
            </div>
            {t.staff.length === 0 && <p className="ds-body ds-secondary">Hali hech kim biriktirilmagan</p>}
            {t.staff.map((s) => (
              <button key={s.id} type="button" className="ds-rk-row ds-jj-crew" onClick={() => open({ kind: "staff", id: s.id })}>
                <span className="ds-jj-avatar" aria-hidden>
                  {initials(s.name)}
                </span>
                <span>
                  <span>{s.name}</span>
                  <span>{s.role}</span>
                </span>
              </button>
            ))}
          </section>
          {t.props.length > 0 && (
            <section className="ds-rk-list" aria-labelledby="jj-props">
              <div className="ds-jj-listhead">
                <h3 id="jj-props" className="ds-caps ds-tertiary">
                  Rekvizit · {t.props.length} nom
                </h3>
                <Link href="/panel/rekvizit" className="ds-xp-link">
                  Rekvizitga oʻtish
                </Link>
              </div>
              {t.props.map((p) => (
                <div key={p.code} className="ds-rk-row" data-static>
                  <span>
                    <span>{p.name}</span>
                    <span>{p.code}</span>
                  </span>
                  <b>× {p.qty}</b>
                </div>
              ))}
            </section>
          )}
          {t.note && (
            <div className="ds-jj-note">
              <span className="ds-caps ds-tertiary">Izoh</span>
              <p className="ds-body">{t.note}</p>
            </div>
          )}
          <div className="ds-sticky-foot">
            <div className="ds-two">
              <Button
                variant="secondary"
                size="l"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(message);
                    toast({ id: Date.now(), text: "Eslatma matni nusxalandi — jamoa chatiga yuboring" });
                  } catch {
                    toast({ id: Date.now(), text: "Nusxalab boʻlmadi" });
                  }
                }}
              >
                Eslatma nusxalash
              </Button>
              <Button size="l" onClick={() => open({ kind: "task-edit", id })} data-autofocus>
                Tahrirlash
              </Button>
            </div>
          </div>
        </>
      )}
      {confirm && t && (
        <ConfirmDialog
          title="Vazifani oʻchirasizmi?"
          description={`${kindLabel(t.kind)} · ${dShort(t.day)} ${t.startsAt}. Jadvaldan olib tashlanadi.`}
          confirm="Oʻchirish"
          tone="destructive"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api(`/api/panel/schedule/tasks/${id}`, { method: "DELETE", body: {} });
            onRemoved();
          }}
        />
      )}
    </Overlay>
  );
}

/* ── S8 · Jamoa jadvali · xodim paneli (498:10719) ── */
export function StaffPanel({ id, week, onClose, open, onRemoved }: { id: string; week: Week; onClose(): void; open(l: Layer): void; onRemoved(): void }) {
  const [confirm, setConfirm] = useState(false);
  const s = week.staff.find((x) => x.id === id);
  if (!s) return null;
  const mine = week.tasks.filter((t) => week.days.includes(t.day) && t.staffIds.includes(id));
  const events = new Set(mine.map((t) => t.orderId).filter(Boolean)).size;
  // longest day this week: first start → last end
  const byDay = new Map<string, Task[]>();
  for (const t of mine) byDay.set(t.day, [...(byDay.get(t.day) ?? []), t]);
  const long = [...byDay.entries()]
    .map(([d, ts]) => ({ d, ts, h: (Math.max(...ts.map((t) => span(t)[1])) - Math.min(...ts.map((t) => span(t)[0]))) / 60 }))
    .filter((x) => x.h >= LONG_DAY_H && x.ts.length > 1)
    .sort((a, b) => b.h - a.h)[0];
  return (
    <Overlay title="Xodim" onClose={onClose} actions={<Menu label="Amallar" items={[{ label: "Tahrirlash", onSelect: () => open({ kind: "staff-edit", staff: s }) }, { label: "Jamoadan olib tashlash", danger: true, onSelect: () => setConfirm(true) }]} />}>
      <div className="ds-rk-dhead">
        <span className="ds-jj-avatar" data-size="l" aria-hidden>
          {initials(s.name)}
        </span>
        <div>
          <p className="ds-h1">{s.name}</p>
          <p className="ds-body ds-secondary">{[s.role, s.phone && formatPhone(s.phone)].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {(s.phone || s.telegram) && (
        <div className="ds-two">
          {s.phone && (
            <a className="ds-btn" data-style="secondary" href={`tel:${s.phone}`}>
              <span>Qoʻngʻiroq</span>
            </a>
          )}
          {s.telegram && (
            <a className="ds-btn" data-style="secondary" href={`https://t.me/${s.telegram}`} target="_blank" rel="noreferrer">
              <span>Telegram</span>
            </a>
          )}
        </div>
      )}
      <div className="ds-rk-stats">
        <div>
          <b>{mine.length}</b>
          <span>Vazifa</span>
        </div>
        <div>
          <b>{weekHours(mine)} soat</b>
          <span>Bu hafta</span>
        </div>
        <div>
          <b>{events}</b>
          <span>Tadbir</span>
        </div>
      </div>
      {long && (
        <div className="ds-alert" data-tone="info" role="note">
          <span className="ds-alert-icon" aria-hidden>
            i
          </span>
          <div>
            <b>
              {dShort(long.d)} — {Math.round(long.h)} soatlik kun
            </b>
            <span>{long.ts.map((t) => `${t.startsAt} ${[t.place, kindLabel(t.kind).toLowerCase()].filter(Boolean).join("da ")}`).join(", ")}</span>
          </div>
        </div>
      )}
      <section className="ds-rk-list" aria-labelledby="jj-week">
        <h3 id="jj-week" className="ds-caps ds-tertiary">
          Bu hafta · {weekLabel(week.week)}
        </h3>
        {mine.length === 0 && <p className="ds-body ds-secondary">Bu hafta vazifa yoʻq</p>}
        {mine.map((t) => (
          <button key={t.id} type="button" className="ds-rk-row ds-jj-wrow" onClick={() => open({ kind: "task", id: t.id })}>
            <span className="ds-jj-date" aria-hidden>
              <b>{Number(t.day.slice(8, 10))}</b>
              <span>{WD_SHORT[weekdayIdx(t.day)].toUpperCase()}</span>
            </span>
            <span>
              <span>
                {kindLabel(t.kind)} · {t.startsAt}
              </span>
              <span>{[t.client, t.place].filter(Boolean).join(" · ") || "—"}</span>
            </span>
          </button>
        ))}
      </section>
      <div className="ds-sticky-foot">
        <div className="ds-two">
          <Button variant="secondary" size="l" onClick={() => open({ kind: "staff-edit", staff: s })}>
            Tahrirlash
          </Button>
          <Button size="l" onClick={() => open({ kind: "task-new", staffIds: [s.id] })} data-autofocus>
            Vazifa berish
          </Button>
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={`${s.name.split(" ")[0]}ni jamoadan olib tashlaysizmi?`}
          description="Kelgusi vazifalari «Biriktirilmagan»ga oʻtadi. Oʻtgan ishlar tarixda qoladi."
          confirm="Olib tashlash"
          tone="destructive"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api(`/api/panel/schedule/staff/${s.id}`, { method: "DELETE", body: {} });
            onRemoved();
          }}
        />
      )}
    </Overlay>
  );
}
