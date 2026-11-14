"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { addDays, MONTHS, WD_SHORT, weekdayIdx } from "@/lib/dates";
import { eventLabel } from "@/lib/studio/calendar";
import { compactSum, greeting, niceMax } from "@/lib/studio/dashboard";
import { groupThousands } from "@/lib/studio/orders";
import { Button } from "../Button";
import { useDataVersion } from "../data";
import { StudioIcon } from "../icons";
import { OrderCard } from "../OrderCard";
import { OrderDetail } from "../OrderDetail";
import { OrderForm } from "../OrderForm";
import { useStudio } from "../PanelProvider";
import { SettingsLink } from "../Shell";
import { Toast, type ToastMsg } from "../Toast";

type Lite = { id: string; date: string; client: string; venue: string | null; eventType: string; total: number; paid: number; balance: number };
type Point = { key: string; paid: number };
type Dash = {
  today: string;
  month: { paid: number; prevPaid: number; deltaPct: number | null };
  debt: { total: number; count: number; overdue: { count: number; total: number }; items: Lite[] };
  next7: Lite[];
  next30Count: number;
  thisWeekCount: number;
  revenue: { months: Point[]; weeks: Point[]; years: Point[] };
  setup: { hasOrders: boolean; hasBlockedDay: boolean; hasTeam: boolean };
};

const SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
const cap1 = (s: string) => s[0].toUpperCase() + s.slice(1);
const rowDate = (iso: string, today: string) =>
  iso === today ? "Bugun" : iso === addDays(today, 1) ? "Ertaga" : `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}, ${WD_SHORT[weekdayIdx(iso)].toLowerCase()}`;
const tashkentHour = () => (new Date().getUTCHours() + 5) % 24;

/* Figma S2 · Dashboard (owner). Money = payments actually received; debt = live balances. */
export function DashboardScreen() {
  const ctx = useStudio();
  const version = useDataVersion();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [layer, setLayer] = useState<{ kind: "new" } | { kind: "order"; id: string } | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    if (!ctx || ctx.studio.role !== "owner") return;
    let alive = true;
    api<Dash>("/api/panel/dashboard")
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [ctx, version, nonce]);

  const first = ctx?.me.user.name.split(" ")[0] ?? "";
  const today = data?.today;
  const monthLabel = today ? `${cap1(MONTHS[Number(today.slice(5, 7)) - 1])} ${today.slice(0, 4)}` : "";
  const empty = data && !data.setup.hasOrders;

  return (
    <>
      <header className="ds-list-head">
        <div>
          <span className="ds-caps ds-tertiary">{ctx ? `${ctx.studio.name}${monthLabel ? ` · ${monthLabel}` : ""}` : " "}</span>
          <h1 className="ds-h1">
            {greeting(tashkentHour())}
            {first ? `, ${first}` : ""}
          </h1>
        </div>
        <div className="ds-cal-actions">
          <span className="ds-desktop-only">
            <Button icon={<StudioIcon name="plus" />} onClick={() => setLayer({ kind: "new" })} disabled={!ctx}>
              Buyurtma qoʻshish
            </Button>
          </span>
          <SettingsLink />
        </div>
      </header>

      {error && !data ? (
        <div className="ds-card ds-stack" role="alert">
          <p className="ds-body-strong">Dashboardni yuklab boʻlmadi</p>
          <p className="ds-body ds-secondary">{error}</p>
          <div>
            <Button variant="secondary" onClick={() => setNonce((n) => n + 1)}>
              Qayta urinish
            </Button>
          </div>
        </div>
      ) : !data ? (
        <Skeleton />
      ) : (
        <>
          <section className="ds-kpis" aria-label="Asosiy koʻrsatkichlar">
            <article className="ds-kpi" data-tone="inverse">
              <h2 className="ds-caps">Bu oy tushum</h2>
              <p className="ds-kpi-val">
                <b>{groupThousands(data.month.paid)}</b>
                <span>soʻm</span>
              </p>
              <Delta month={data.month} />
              <MiniBars points={data.revenue.months.slice(-6)} />
            </article>
            <article className="ds-kpi" data-tone="due">
              <h2 className="ds-caps">Qoldiq</h2>
              <p className="ds-kpi-val">
                <b>{groupThousands(data.debt.total)}</b>
                <span>soʻm</span>
              </p>
              <p>{data.debt.count ? `${data.debt.count} ta buyurtmada` : "Qoldiq yoʻq"}</p>
            </article>
            <article className="ds-kpi">
              <h2 className="ds-caps">Keyingi 30 kun</h2>
              <p className="ds-kpi-val">
                <b>{data.next30Count} tadbir</b>
              </p>
              <p>{data.next30Count ? (data.thisWeekCount ? `${data.thisWeekCount} tasi shu hafta` : "Shu hafta boʻsh") : "Kalendar boʻsh"}</p>
            </article>
          </section>

          {empty ? (
            <Setup data={data} studio={ctx?.studio.name ?? ""} onNew={() => setLayer({ kind: "new" })} />
          ) : (
            <>
              <div className="ds-cols">
                <section className="ds-panelcard" aria-labelledby="next7">
                  <div className="ds-cardhead">
                    <h2 id="next7" className="ds-caps ds-tertiary">
                      Keyingi 7 kun
                    </h2>
                    <Link href="/panel/kalendar" className="ds-desktop-only">
                      Kalendar
                    </Link>
                    <span className="ds-label-strong ds-mobile-only">{data.next7.length} tadbir</span>
                  </div>
                  <WeekStrip data={data} capacity={ctx?.studio.dailyCapacity ?? 3} />
                  {data.next7.length ? (
                    <div className="ds-events ds-desktop-only">
                      {data.next7.map((o) => (
                        <button key={o.id} className="ds-event" onClick={() => setLayer({ kind: "order", id: o.id })}>
                          <span className="e-date">{rowDate(o.date, data.today)}</span>
                          <span className="e-client">{o.client}</span>
                          <span className="e-place">{[o.venue, eventLabel(o.eventType)].filter(Boolean).join(" · ")}</span>
                          {o.balance > 0 ? (
                            <span className="e-money">{groupThousands(o.balance)} soʻm</span>
                          ) : (
                            <span className="e-money" data-paid>
                              Toʻlangan
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="ds-body ds-secondary">Keyingi 7 kunda tadbir yoʻq</p>
                  )}
                </section>

                <section className="ds-panelcard" aria-labelledby="debt-h">
                  <div className="ds-cardhead">
                    <h2 id="debt-h" className="ds-caps ds-tertiary">
                      Qoldiq bor
                    </h2>
                    {data.debt.count > 0 && <Link href="/panel/buyurtmalar?view=debt">Hammasi · {data.debt.count}</Link>}
                  </div>
                  {data.debt.count === 0 ? (
                    <p className="ds-body ds-secondary">Hamma buyurtmalar toʻliq toʻlangan</p>
                  ) : (
                    <>
                      <div className="ds-stack" style={{ gap: "var(--ds-space-4)" }}>
                        <span className="ds-label ds-secondary">Jami qoldiq</span>
                        <span className="ds-h2" style={{ color: "var(--ds-money-due)" }}>
                          {groupThousands(data.debt.total)} soʻm
                        </span>
                      </div>
                      {data.debt.overdue.count > 0 && (
                        <div className="ds-alert" data-tone="danger" role="note">
                          <span className="ds-alert-icon" aria-hidden>
                            !
                          </span>
                          <div>
                            <b>
                              {data.debt.overdue.count} tasi kechikdi · {groupThousands(data.debt.overdue.total)} soʻm
                            </b>
                            <span>Tadbir oʻtgan, qoldiq hali olinmagan</span>
                          </div>
                        </div>
                      )}
                      {data.debt.items.slice(0, 3).map((o) => (
                        <OrderCard key={o.id} order={o} today={data.today} onOpen={() => setLayer({ kind: "order", id: o.id })} />
                      ))}
                    </>
                  )}
                </section>
              </div>

              <Revenue data={data} />
            </>
          )}
        </>
      )}

      <button className="ds-fab" aria-label="Buyurtma qoʻshish" onClick={() => setLayer({ kind: "new" })}>
        <StudioIcon name="plus" size={24} />
      </button>

      {layer?.kind === "new" && (
        <OrderForm
          onClose={() => setLayer(null)}
          onSaved={(r) => {
            setLayer(null);
            setToast({ id: Date.now(), text: "Buyurtma saqlandi", action: { label: "Ochish", run: () => setLayer({ kind: "order", id: r.order.id }) } });
          }}
        />
      )}
      {layer?.kind === "order" && <OrderDetail id={layer.id} onClose={() => setLayer(null)} toast={setToast} />}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

function Delta({ month }: { month: Dash["month"] }) {
  if (month.paid === 0 && month.prevPaid === 0) return <p>Birinchi toʻlovdan keyin chiqadi</p>;
  if (month.deltaPct === null) return <p>Oʻtgan oyda shu davrda tushum yoʻq edi</p>;
  const down = month.deltaPct < 0;
  return (
    <p className="ds-delta">
      <b data-down={down || undefined}>
        {down ? "↓" : "↑"} {Math.abs(month.deltaPct)}%
      </b>
      <span title="Oyning shu kunigacha boʻlgan tushum, oʻtgan oyning xuddi shu kunlari bilan">oʻtgan oyga nisbatan</span>
    </p>
  );
}

/* Inverse KPI decoration: last 6 months, current highlighted — mobile only (Figma) */
function MiniBars({ points }: { points: Point[] }) {
  const max = Math.max(1, ...points.map((p) => p.paid));
  return (
    <span className="ds-mini ds-mobile-only" aria-hidden>
      {points.map((p, i) => (
        <i key={p.key} data-now={i === points.length - 1 || undefined} style={{ height: `${Math.max(8, (p.paid / max) * 48)}px` }} />
      ))}
    </span>
  );
}

/* Mobile "Keyingi 7 kun" (Figma): one pill per day, height by load, booked days in day/booked */
function WeekStrip({ data, capacity }: { data: Dash; capacity: number }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(data.today, i));
  const load = new Map<string, number>();
  for (const o of data.next7) load.set(o.date, (load.get(o.date) ?? 0) + 1);
  return (
    <div className="ds-mobile-only">
      <div className="ds-strip" role="list" aria-label="Keyingi 7 kun bandligi">
        {days.map((d) => {
          const n = load.get(d) ?? 0;
          return (
            <div key={d} role="listitem" data-today={d === data.today || undefined} aria-label={`${rowDate(d, data.today)}: ${n ? `${n} ta tadbir` : "boʻsh"}`}>
              {n > 0 && <i data-full={n >= capacity || undefined} style={{ height: `${28 + Math.min(1, n / capacity) * 64}px` }} />}
              <span aria-hidden>{WD_SHORT[weekdayIdx(d)]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Figma "Tushum" — single-series bar chart, Hafta / Oy / Yil, hover + keyboard tooltip, table for screen readers */
function Revenue({ data }: { data: Dash }) {
  const [period, setPeriod] = useState<"weeks" | "months" | "years">("months");
  const [hover, setHover] = useState<number | null>(null);
  const points = data.revenue[period];
  const max = useMemo(() => niceMax(Math.max(...points.map((p) => p.paid))), [points]);
  const label = (p: Point) =>
    period === "months" ? SHORT[Number(p.key.slice(5, 7)) - 1] : period === "weeks" ? `${Number(p.key.slice(8, 10))}-${SHORT[Number(p.key.slice(5, 7)) - 1].toLowerCase()}` : p.key;
  const fullLabel = (p: Point) => (period === "months" ? `${cap1(MONTHS[Number(p.key.slice(5, 7)) - 1])} ${p.key.slice(0, 4)}` : period === "weeks" ? `${label(p)} haftasi` : `${p.key}-yil`);
  const caption = { weeks: "Oxirgi 12 hafta · mln soʻm", months: "Oxirgi 12 oy · mln soʻm", years: "Oxirgi 5 yil · mln soʻm" }[period];
  const ticks = [0, 1, 2, 3].map((i) => (max / 3) * i);
  const shown = hover ?? points.length - 1;

  return (
    <section className="ds-panelcard ds-desktop-only" aria-labelledby="rev-h" style={{ gap: "var(--ds-space-24)" }}>
      <div className="ds-chart-head">
        <div className="ds-stack" style={{ gap: "var(--ds-space-4)" }}>
          <h2 id="rev-h" className="ds-h3">
            Tushum
          </h2>
          <p className="ds-label ds-secondary">{caption}</p>
        </div>
        <div className="ds-segment" role="radiogroup" aria-label="Davr">
          {(["weeks", "months", "years"] as const).map((p) => (
            <button key={p} role="radio" aria-checked={period === p} onClick={() => {
              setPeriod(p);
              setHover(null);
            }}>
              {{ weeks: "Hafta", months: "Oy", years: "Yil" }[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="ds-chart">
        <div className="ds-yaxis" aria-hidden>
          {ticks.map((t) => (
            <span key={t} style={{ top: `${(1 - t / max) * (100 - (26 / 240) * 100)}%` }}>
              {Math.round(t / 1_000_000)}
            </span>
          ))}
        </div>
        <div className="ds-plot" role="list" aria-label={`Tushum, ${caption}`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <span key={t} className="ds-gridline" aria-hidden style={{ bottom: `calc(26px + (100% - 26px) * ${t / max})` }} />
          ))}
          {points.map((p, i) => (
            <div
              key={p.key}
              className="ds-col"
              role="listitem"
              aria-label={`${fullLabel(p)}: ${groupThousands(p.paid)} soʻm`}
              data-now={i === points.length - 1 || undefined}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <span className="ds-bar" aria-hidden style={{ height: `${(p.paid / max) * 100}%` }} />
              <span className="ds-xlabel" aria-hidden>
                {label(p)}
              </span>
              {i === shown && (
                <span className="ds-tip" aria-hidden style={{ left: "50%", bottom: `calc(${(p.paid / max) * 100}% - 0px)`, top: "auto", transform: "translate(-50%, -8px)" }}>
                  {hover === null ? compactSum(p.paid) : `${fullLabel(p)} · ${compactSum(p.paid)}`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

/* Figma S2 · Dashboard · boʻsh — setup checklist */
function Setup({ data, studio, onNew }: { data: Dash; studio: string; onNew(): void }) {
  const steps = [
    { done: true, title: "Studiya yaratildi", text: studio, action: null },
    { done: data.setup.hasBlockedDay, title: "Band kunlarni yoping", text: "Oldindan band sanalarni kalendarda belgilang", action: <Link className="ds-btn" data-style="secondary" href="/panel/kalendar"><span>Kalendarni ochish</span></Link> },
    { done: data.setup.hasTeam, title: "Jamoani taklif qiling", text: "Menejer buyurtma qoʻshadi, tushumni koʻrmaydi", action: <Link className="ds-btn" data-style="secondary" href="/panel/sozlamalar"><span>Taklif qilish</span></Link> },
    { done: data.setup.hasOrders, title: "Birinchi buyurtmani qoʻshing", text: "Qoldiq va tushum shu yerda hisoblanadi", action: <Button variant="secondary" onClick={onNew}>Buyurtma qoʻshish</Button> },
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="ds-panelcard" aria-labelledby="setup-h">
      <div className="ds-cardhead" style={{ alignItems: "flex-start" }}>
        <div className="ds-stack" style={{ gap: "var(--ds-space-4)" }}>
          <h2 id="setup-h" className="ds-h3">
            Studiyani ishga tushiring
          </h2>
          <p className="ds-label ds-secondary">
            4 qadamdan {done} tasi bajarildi · taxminan 5 daqiqa
          </p>
        </div>
        <span className="ds-h3 ds-brand">{done}/4</span>
      </div>
      <div className="ds-progress" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={done} aria-label="Sozlash jarayoni">
        <i style={{ width: `${(done / 4) * 100}%` }} />
      </div>
      <ol className="ds-steps">
        {steps.map((s) => (
          <li key={s.title} data-done={s.done || undefined}>
            <span className="ds-check" aria-hidden>
              {s.done && <StudioIcon name="check" size={16} />}
            </span>
            <div>
              <strong className="ds-body-medium">{s.title}</strong>
              <span className="ds-label ds-secondary">{s.text}</span>
            </div>
            {s.done ? <span className="ds-label-strong ds-brand">Bajarildi</span> : s.action}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Skeleton() {
  return (
    <>
      <div className="ds-kpis" aria-busy>
        {[0, 1, 2].map((i) => (
          <span key={i} className="ds-skeleton" style={{ height: 130, borderRadius: "var(--ds-radius-2xl)" }} />
        ))}
      </div>
      <div className="ds-cols">
        <span className="ds-skeleton" style={{ height: 420, borderRadius: "var(--ds-radius-xl)" }} />
        <span className="ds-skeleton" style={{ height: 420, borderRadius: "var(--ds-radius-xl)" }} />
      </div>
    </>
  );
}
