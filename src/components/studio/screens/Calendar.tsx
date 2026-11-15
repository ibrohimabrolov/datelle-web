"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { addDays, addMonths, isISODate, MONTHS, todayISO, WD_FULL, WD_SHORT, weekdayIdx } from "@/lib/dates";
import { canBlock, DAY_REASONS, dayStatus, freeSlots, monthWeeks, reasonLabel, type DayReason, type DayStatus } from "@/lib/studio/calendar";
import { Button } from "../Button";
import { StudioIcon } from "../icons";
import { OrderCard } from "../OrderCard";
import { OrderDetail } from "../OrderDetail";
import { OrderForm } from "../OrderForm";
import { Overlay } from "../Overlay";
import { useStudio } from "../PanelProvider";
import { Toast, type ToastMsg } from "../Toast";
import { SettingsLink } from "../Shell";
import { fetchMonth, monthCache, monthKey, useDataVersion, type CalDay, type CalOrder, type MonthData } from "../data";

/* ── data ── */
type Order = CalOrder;
type Day = CalDay;
const cache = monthCache;
const key = monthKey;

function useMonth(studioId: string | undefined, month: string) {
  const [state, setState] = useState<{ data: MonthData | null; error: string | null; for: string | null }>({ data: null, error: null, for: null });
  const [nonce, setNonce] = useState(0);
  const version = useDataVersion(); // an order saved anywhere → this month refetches

  useEffect(() => {
    if (!studioId) return;
    let alive = true;
    const hadCache = cache.has(key(studioId, month));
    fetchMonth(studioId, month)
      .then((d) => alive && setState({ data: d, error: null, for: month }))
      .catch((e) => alive && !hadCache && setState({ data: null, error: e instanceof ApiError ? e.message : "Yuklab boʻlmadi", for: month }));
    // warm the neighbours so ‹ › never wait
    for (const m of [addMonths(month, -1), addMonths(month, 1)]) if (!cache.has(key(studioId, m))) fetchMonth(studioId, m).catch(() => {});
    return () => {
      alive = false;
    };
  }, [studioId, month, nonce, version]);

  const patchDay = useCallback(
    (day: Day) => {
      if (!studioId) return;
      const m = day.date.slice(0, 7);
      const cur = cache.get(key(studioId, m));
      if (!cur) return;
      const days = cur.days.filter((d) => d.date !== day.date);
      if (day.blocked || day.load) days.push(day);
      days.sort((a, b) => (a.date < b.date ? -1 : 1));
      const next = { ...cur, days };
      cache.set(key(studioId, m), next);
      setState({ data: next, error: null, for: m });
    },
    [studioId],
  );

  // Derived during render: a fresh fetch for this month wins, else the cache (stale-while-revalidate), else loading
  const current = state.for === month ? state : { data: studioId ? (cache.get(key(studioId, month)) ?? null) : null, error: null };
  return { data: current.data, error: current.error, reload: () => setNonce((n) => n + 1), patchDay };
}

/* ── helpers ── */
const cap1 = (s: string) => s[0].toUpperCase() + s.slice(1);
const monthName = (m: string) => cap1(MONTHS[Number(m.slice(5, 7)) - 1]);
const dayTitle = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUS_WORD: Record<DayStatus, string> = { free: "boʻsh", has: "", limited: "1 joy boʻsh", booked: "band", blocked: "yopiq" };

function emptyDay(date: string, capacity: number): Day {
  return { date, status: dayStatus(0, capacity, false), load: 0, blocked: false, reason: null, note: null, orders: [] };
}

/* ── screen ── */
export function CalendarScreen() {
  const ctx = useStudio();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const today = todayISO();

  const sana = params.get("sana");
  const selected = sana && isISODate(sana) ? sana : null;
  const oy = params.get("oy");
  const month = oy && MONTH_RE.test(oy) ? oy : (selected?.slice(0, 7) ?? today.slice(0, 7));

  const { data, error, reload, patchDay } = useMonth(ctx?.studio.id, month);
  const capacity = data?.capacity ?? ctx?.studio.dailyCapacity ?? 3;
  const byDate = useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);
  const dayOf = useCallback((iso: string) => byDate.get(iso) ?? emptyDay(iso, capacity), [byDate, capacity]);

  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "close">("view");
  const [toast, setToast] = useState<ToastMsg | null>(null);
  // order layers open in place so the calendar stays behind them (demo flow: day → new order → "1 joy")
  const [layer, setLayer] = useState<{ kind: "new"; date?: string } | { kind: "order"; id: string } | null>(null);
  const openLayer = (l: NonNullable<typeof layer>) => {
    setMode("view");
    if (selected) go({ sana: null });
    setLayer(l);
  };
  const gridRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: { oy?: string; sana?: string | null }) => {
      const q = new URLSearchParams(params.toString());
      if (next.oy !== undefined) q.set("oy", next.oy);
      if (next.sana === null) q.delete("sana");
      else if (next.sana) q.set("sana", next.sana);
      router.replace(`${path}?${q.toString()}`, { scroll: false });
    },
    [params, path, router],
  );

  const open = (iso: string) => {
    setMode("view");
    setFocusDate(iso);
    go({ oy: iso.slice(0, 7), sana: iso });
  };
  const closePanel = () => {
    const was = selected;
    setMode("view");
    go({ sana: null });
    // return focus to the day that opened the panel (also when the panel came from a deep link)
    if (was) {
      setFocusDate(was);
      requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-date="${was}"]`)?.focus({ preventScroll: true }));
    }
  };

  // keyboard focus follows month changes made from the keyboard
  useEffect(() => {
    if (!focusDate || focusDate.slice(0, 7) !== month) return;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focusDate}"]`)?.focus({ preventScroll: true });
  }, [focusDate, month, data]);

  function onGridKey(e: KeyboardEvent) {
    const from = (e.target as HTMLElement).dataset.date;
    if (!from) return;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(from, -1),
      ArrowRight: () => addDays(from, 1),
      ArrowUp: () => addDays(from, -7),
      ArrowDown: () => addDays(from, 7),
      Home: () => addDays(from, -weekdayIdx(from)),
      End: () => addDays(from, 6 - weekdayIdx(from)),
      PageUp: () => `${addMonths(from.slice(0, 7), -1)}-01`,
      PageDown: () => `${addMonths(from.slice(0, 7), 1)}-01`,
    };
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    const next = mv();
    setFocusDate(next);
    if (next.slice(0, 7) !== month) go({ oy: next.slice(0, 7) });
  }

  async function setBlocked(date: string, body: { blocked: boolean; reason?: DayReason; note?: string }, quiet = false) {
    const r = await api<{ day: Day; warnings: string[] }>(`/api/panel/days/${date}`, { method: "PUT", body });
    patchDay(r.day);
    if (quiet) return r;
    const before = dayOf(date);
    setToast({
      id: Date.now(),
      text: body.blocked ? `${dayTitle(date)} yopildi · ${reasonLabel(body.reason)?.toLowerCase()}` : `${dayTitle(date)} ochildi`,
      action: {
        label: "Bekor qilish",
        run: () =>
          void setBlocked(
            date,
            body.blocked ? { blocked: false } : { blocked: true, reason: (before.reason as DayReason) ?? "boshqa", note: before.note ?? undefined },
            true,
          ).catch(() => setToast({ id: Date.now(), text: "Qaytarib boʻlmadi" })),
      },
    });
    return r;
  }

  const weeks = useMemo(() => monthWeeks(month), [month]);
  const rovingDate = focusDate?.slice(0, 7) === month ? focusDate : selected?.slice(0, 7) === month ? selected : today.slice(0, 7) === month ? today : `${month}-01`;
  const todays = month === today.slice(0, 7) ? dayOf(today).orders : null;

  return (
    <>
      <header className="ds-cal-head">
        <div>
          <span className="ds-caps ds-tertiary">{ctx?.studio.name ?? " "}</span>
          <h1 className="ds-h1" aria-live="polite">
            {monthName(month)} <span className="ds-year">{month.slice(0, 4)}</span>
          </h1>
        </div>
        <div className="ds-cal-actions">
          <button className="ds-iconbtn" data-style="secondary" onClick={() => go({ oy: addMonths(month, -1), sana: null })} aria-label="Oldingi oy">
            <StudioIcon name="chevron-left" />
          </button>
          <button className="ds-iconbtn" data-style="secondary" onClick={() => go({ oy: addMonths(month, 1), sana: null })} aria-label="Keyingi oy">
            <StudioIcon name="chevron-right" />
          </button>
          <SettingsLink />
          <span className="ds-desktop-only" style={{ display: "contents" }}>
            <Button variant="secondary" onClick={() => open(today)} disabled={!ctx}>
              Bugun
            </Button>
            <Button icon={<StudioIcon name="plus" />} onClick={() => openLayer({ kind: "new", date: selected ?? undefined })} disabled={!ctx}>
              Buyurtma qoʻshish
            </Button>
          </span>
        </div>
      </header>

      <div className="ds-cal-meta">
        <p className="ds-body" aria-live="polite">
          {data ? (
            data.summary.events ? (
              <>
                <b className="ds-body-strong">{data.summary.events} tadbir</b>
                {data.summary.due > 0 && <span className="ds-due"> · {data.summary.due} ta qoldiq</span>}
              </>
            ) : (
              <span className="ds-secondary">Bu oyda tadbir yoʻq</span>
            )
          ) : (
            <span className="ds-skeleton" style={{ display: "inline-block", width: 160, height: 22 }} />
          )}
        </p>
        <Legend className="ds-desktop-only" desktop />
      </div>

      {error && !data ? (
        <div className="ds-card ds-stack" role="alert">
          <p className="ds-body-strong">Kalendarni yuklab boʻlmadi</p>
          <p className="ds-body ds-secondary">{error}</p>
          <div>
            <Button variant="secondary" onClick={reload}>
              Qayta urinish
            </Button>
          </div>
        </div>
      ) : (
        <div className="ds-gridcard">
          <div className="ds-grid" role="grid" aria-label={`${monthName(month)} ${month.slice(0, 4)}`} aria-busy={!data || undefined} ref={gridRef} onKeyDown={onGridKey}>
            <div role="row">
              {WD_SHORT.map((w, i) => (
                <div role="columnheader" className="ds-wd" key={w}>
                  <abbr title={cap1(WD_FULL[i])} className="ds-mobile-only">
                    {w}
                  </abbr>
                  <span className="ds-desktop-only">{WD_FULL[i]}</span>
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div role="row" key={wi}>
                {week.map((iso, di) =>
                  iso ? (
                    <div role="gridcell" key={iso} aria-selected={iso === selected}>
                      <DayCell
                        day={dayOf(iso)}
                        capacity={capacity}
                        today={today}
                        selected={iso === selected}
                        tabbable={iso === rovingDate}
                        loading={!data}
                        onOpen={() => open(iso)}
                      />
                    </div>
                  ) : (
                    <div role="gridcell" key={`x${di}`} aria-hidden>
                      <span className="ds-day" data-outside />
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Legend className="ds-mobile-only" />

      {todays && (
        <section className="ds-stack ds-mobile-only" aria-labelledby="today-h" style={{ gap: 10 }}>
          <h2 id="today-h" className="ds-caps ds-tertiary">
            Bugun, {dayTitle(today)}
          </h2>
          {todays.length ? (
            todays.map((o) => <OrderCard key={o.id} order={{ ...o, date: today }} today={today} onOpen={() => openLayer({ kind: "order", id: o.id })} />)
          ) : (
            <p className="ds-body ds-secondary">Bugun tadbir yoʻq</p>
          )}
        </section>
      )}

      <button className="ds-fab" aria-label="Buyurtma qoʻshish" onClick={() => openLayer({ kind: "new", date: selected ?? undefined })}>
        <StudioIcon name="plus" size={24} />
      </button>

      {selected && data && (
        <DayPanel
          key={`${selected}:${mode}`}
          day={dayOf(selected)}
          capacity={capacity}
          today={today}
          mode={mode}
          onMode={setMode}
          onClose={closePanel}
          onNew={(date) => openLayer({ kind: "new", date })}
          onOpenOrder={(id) => openLayer({ kind: "order", id })}
          onSave={async (body) => {
            const r = await setBlocked(selected, body);
            setMode("view");
            if (body.blocked) closePanel();
            return r;
          }}
        />
      )}

      {layer?.kind === "new" && (
        <OrderForm
          date={layer.date}
          onClose={() => setLayer(null)}
          onSaved={(r) => {
            setLayer(null);
            const d = r.order.date;
            setToast({
              id: Date.now(),
              text: r.warnings.includes("capacity_exceeded") ? `${dayTitle(d)} · sigʻim toʻlgan, baribir saqlandi` : `Buyurtma saqlandi · ${dayTitle(d)}`,
              action: { label: "Ochish", run: () => setLayer({ kind: "order", id: r.order.id }) },
            });
            if (d.slice(0, 7) !== month) go({ oy: d.slice(0, 7) });
          }}
        />
      )}
      {layer?.kind === "order" && <OrderDetail id={layer.id} onClose={() => setLayer(null)} toast={setToast} />}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

/* Legend — Figma differs per breakpoint: mobile swatches use the text colours of the round cells,
   desktop uses the cell fills of DayCell Large */
function Legend({ className, desktop }: { className?: string; desktop?: boolean }) {
  const items: [string, string][] = desktop
    ? [["Boʻsh", "var(--ds-day-free-bg)"], ["1 joy", "var(--ds-day-limited-bg)"], ["Band", "var(--ds-day-booked-bg)"], ["Yopiq", "var(--ds-day-blocked-bg)"]]
    : [["Boʻsh", "var(--ds-day-free-bg)"], ["1 joy", "var(--ds-day-limited-text)"], ["Band", "var(--ds-day-booked-bg)"], ["Yopiq", "var(--ds-bg-muted)"]];
  return (
    <p className={`ds-legend ${className ?? ""}`} aria-hidden>
      {items.map(([label, color], i) => (
        <span key={label}>
          <i style={{ background: color, boxShadow: i === 0 ? `inset 0 0 0 ${desktop ? 1 : 1.5}px var(--ds-${desktop ? "day-free-border" : "border-strong"})` : undefined }} />
          {label}
        </span>
      ))}
    </p>
  );
}

/* DayCell (mobile 3:39) and DayCell Large (desktop 3:79) — one element, two layouts in CSS */
function DayCell({ day, capacity, today, selected, tabbable, loading, onOpen }: { day: Day; capacity: number; today: string; selected: boolean; tabbable: boolean; loading: boolean; onOpen(): void }) {
  const n = Number(day.date.slice(8, 10));
  const isToday = day.date === today;
  const chips = day.orders.length > 2 ? [...day.orders.slice(0, 1).map(chipText), `+${day.orders.length - 1}`] : day.orders.map(chipText);
  const label = [
    `${n}-${MONTHS[Number(day.date.slice(5, 7)) - 1]}, ${WD_FULL[weekdayIdx(day.date)]}`,
    isToday ? "bugun" : "",
    day.load ? `${day.load} ta buyurtma` : "",
    day.status === "has" ? `${freeSlots(day.load, capacity)} joy boʻsh` : STATUS_WORD[day.status],
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      className="ds-day"
      data-date={day.date}
      data-status={loading ? undefined : day.status}
      data-today={isToday || undefined}
      data-selected={selected || undefined}
      aria-current={isToday ? "date" : undefined}
      aria-label={label}
      tabIndex={tabbable ? 0 : -1}
      onClick={onOpen}
    >
      <span className="ds-dhead">
        <span className="ds-num">{n}</span>
        {day.status === "limited" && <span className="ds-cap">1 joy</span>}
        {day.status === "blocked" && <StudioIcon name="lock" variant="Filled" size={14} className="ds-desktop-only" />}
        {isToday && day.status !== "limited" && day.status !== "blocked" && <span className="ds-todaytag">Bugun</span>}
      </span>
      {day.status === "blocked" ? (
        <>
          <span className="ds-chip">Yopiq</span>
          <span className="ds-dots ds-mobile-only" style={{ height: 12 }}>
            <StudioIcon name="lock" variant="Filled" size={12} />
          </span>
        </>
      ) : (
        <>
          {chips.map((c, i) => (
            <span className="ds-chip" key={i}>
              {c}
            </span>
          ))}
          <span className="ds-dots">
            {Array.from({ length: Math.min(day.load, 3) }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </>
      )}
    </button>
  );
}
const chipText = (o: Order) => [o.client.split(/\s+/)[0], o.venue].filter(Boolean).join(" · ");

/* ── Day panel: view / close (Figma S3 Kalendar + panel, Kunni yopish, Kun · yopiq) ── */
function DayPanel({
  day,
  capacity,
  today,
  mode,
  onMode,
  onClose,
  onSave,
  onNew,
  onOpenOrder,
}: {
  onNew(date: string): void;
  onOpenOrder(id: string): void;
  day: Day;
  capacity: number;
  today: string;
  mode: "view" | "close";
  onMode(m: "view" | "close"): void;
  onClose(): void;
  onSave(body: { blocked: boolean; reason?: DayReason; note?: string }): Promise<unknown>;
}) {
  const [reason, setReason] = useState<DayReason>("tamir");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editable = canBlock(day.date, today);
  const free = freeSlots(day.load, capacity);

  async function save(body: { blocked: boolean; reason?: DayReason; note?: string }) {
    setBusy(true);
    setErr(null);
    try {
      await onSave(body);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Saqlab boʻlmadi. Qayta urinib koʻring.");
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <div className="ds-dayhead">
      <b>{Number(day.date.slice(8, 10))}</b>
      <div>
        <span className="ds-h3">{cap1(WD_FULL[weekdayIdx(day.date)])}</span>
        <span className="ds-label ds-secondary">
          {monthName(day.date)} {day.date.slice(0, 4)}
        </span>
      </div>
      {mode === "view" &&
        (day.blocked ? (
          <span className="ds-pill">
            <StudioIcon name="lock" variant="Filled" size={14} />
            Yopiq
          </span>
        ) : (
          <span className="ds-capmeter" data-status={day.status}>
            {capacity <= 6 && (
              <span aria-hidden>
                {Array.from({ length: capacity }, (_, i) => (
                  <i key={i} data-used={i < day.load || undefined} />
                ))}
              </span>
            )}
            {free > 0 ? `${free} joy boʻsh` : "Band"}
          </span>
        ))}
    </div>
  );

  if (mode === "close") {
    return (
      <Overlay title="Kunni yopish" onClose={onClose}>
        {header}
        <hr className="ds-divider" />
        <div className="ds-stack" style={{ gap: "var(--ds-space-12)" }}>
          <span className="ds-caps ds-tertiary" id="reason-label">
            Sabab
          </span>
          <div className="ds-chips" role="radiogroup" aria-labelledby="reason-label">
            {DAY_REASONS.map((r, i) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                className="ds-chip-btn"
                aria-checked={reason === r.value}
                tabIndex={reason === r.value ? 0 : -1}
                data-autofocus={i === 0 || undefined}
                onClick={() => setReason(r.value)}
                onKeyDown={(e) => {
                  const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                  if (!d) return;
                  e.preventDefault();
                  const next = DAY_REASONS[(i + d + DAY_REASONS.length) % DAY_REASONS.length];
                  setReason(next.value);
                  (e.currentTarget.parentElement?.children[DAY_REASONS.indexOf(next)] as HTMLElement | undefined)?.focus();
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ds-field">
          <label htmlFor="day-note">Izoh (ixtiyoriy)</label>
          <input id="day-note" className="ds-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan, zal taʼmirda" maxLength={140} />
        </div>
        {day.load > 0 && (
          <p className="ds-alert" data-tone="warning">
            Bu kunda {day.load} ta buyurtma bor — ular saqlanib qoladi
          </p>
        )}
        {/* Figma copy said "Mijozlar bu sanani band deb koʻradi" — there are no clients in Studio; rewritten for the team */}
        <p className="ds-note">Bu kunga yangi buyurtma qoʻshilsa, ogohlantirish chiqadi. Istalgan payt qayta ochasiz.</p>
        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-panel-foot">
          <Button size="l" block loading={busy} onClick={() => save({ blocked: true, reason, note: note.trim() || undefined })}>
            Kunni yopish
          </Button>
          <Button variant="ghost" size="l" block onClick={() => onMode("view")} disabled={busy}>
            Bekor qilish
          </Button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay title="Kun" onClose={onClose}>
      {header}
      <hr className="ds-divider" />
      {day.blocked && (
        <p className="ds-body ds-secondary">
          Sabab: {reasonLabel(day.reason)?.toLowerCase() ?? "koʻrsatilmagan"}
          {day.note && <> — {day.note}</>}
        </p>
      )}
      {day.orders.length > 0 ? (
        <section className="ds-stack" aria-labelledby="day-orders" style={{ gap: "var(--ds-space-12)" }}>
          <h3 id="day-orders" className="ds-caps ds-tertiary">
            {day.orders.length} ta buyurtma
          </h3>
          {day.orders.map((o) => (
            <OrderCard key={o.id} order={{ ...o, date: day.date }} today={today} onOpen={() => onOpenOrder(o.id)} />
          ))}
        </section>
      ) : (
        !day.blocked && <p className="ds-body ds-secondary">Bu kunda buyurtma yoʻq</p>
      )}
      {err && (
        <p className="ds-alert" role="alert">
          {err}
        </p>
      )}
      {editable && (
        <div className="ds-stack" style={{ paddingTop: "var(--ds-space-4)" }}>
          {day.blocked ? (
            <Button size="l" block loading={busy} data-autofocus onClick={() => save({ blocked: false })}>
              Kunni ochish
            </Button>
          ) : (
            <>
              <Button size="l" block icon={<StudioIcon name="plus" />} onClick={() => onNew(day.date)} data-autofocus>
                Buyurtma qoʻshish
              </Button>
              <Button variant="secondary" size="l" block icon={<StudioIcon name="lock" variant="Filled" />} onClick={() => onMode("close")}>
                Kunni yopish
              </Button>
            </>
          )}
        </div>
      )}
    </Overlay>
  );
}
