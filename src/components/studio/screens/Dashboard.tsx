"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { addDays, MONTHS, WD_SHORT, weekdayIdx } from "@/lib/dates";
import { dayStatus, eventLabel, eventTone } from "@/lib/studio/calendar";
import { compactSum, greeting, niceMax } from "@/lib/studio/dashboard";
import { groupThousands } from "@/lib/studio/orders";
import { Button } from "../Button";
import { BulkRemind } from "../BulkRemind";
import { useDataVersion } from "../data";
import { StudioIcon } from "../icons";
import { Illustration, StateBlock } from "../StateBlock";
import { OrderCard } from "../OrderCard";
import { OrderDetail } from "../OrderDetail";
import { OrderForm } from "../OrderForm";
import { useStudio } from "../PanelProvider";
import { SettingsLink } from "../Shell";
import { Toast, type ToastMsg } from "../Toast";

type Lite = { id: string; date: string; client: string; phone: string; venue: string | null; eventType: string; total: number; paid: number; balance: number };
type Point = { key: string; paid: number };
type Dash = {
  today: string;
  month: { paid: number; prevPaid: number; deltaPct: number | null };
  debt: { total: number; count: number; overdue: { count: number; total: number; items: Lite[] }; week: { count: number; total: number }; items: Lite[] };
  next7: Lite[];
  next30: { date: string; load: number; blocked: boolean }[];
  newOrders: { count: number; prevCount: number; deltaPct: number | null; advanced: number; advancedSum: number };
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
const monthOf = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
const prevMonthOf = (iso: string) => MONTHS[(Number(iso.slice(5, 7)) + 10) % 12];
/* Figma "Keyingi 7 kun" date column: Bugun · Ertaga · 15-may */
const shortDay = (iso: string, today: string) => (iso === today ? "Bugun" : iso === addDays(today, 1) ? "Ertaga" : `${Number(iso.slice(8, 10))}-${SHORT[Number(iso.slice(5, 7)) - 1].toLowerCase()}`);
/* y-axis in mln: 0 · 20 · 40 · 60, or 0 · 0,5 · 1 · 1,5 for small studios */
const axisMln = (n: number) => String(Math.round((n / 1_000_000) * 10) / 10).replace(".", ",");
const daysLate = (iso: string, today: string) => Math.round((Date.parse(today) - Date.parse(iso)) / 86_400_000);

/* Figma S2 · Dashboard (owner). Money = payments actually received; debt = live balances. */
export function DashboardScreen() {
  const ctx = useStudio();
  const version = useDataVersion();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [layer, setLayer] = useState<{ kind: "new" } | { kind: "order"; id: string } | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [remind, setRemind] = useState<Lite[] | null>(null);

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
      <header className="ds-list-head" data-wide>
        <div>
          <span className="ds-caps ds-tertiary ds-mobile-only">{ctx ? `${ctx.studio.name}${monthLabel ? ` · ${monthLabel}` : ""}` : " "}</span>
          <h1 className="ds-h1">
            {greeting(tashkentHour())}
            {first ? `, ${first}` : ""}
          </h1>
        </div>
        <div className="ds-cal-actions">
          <span className="ds-desktop-only">
            <Button icon={<StudioIcon name="plus" />} onClick={() => setLayer({ kind: "new" })} disabled={!ctx || Boolean(error && !data)}>
              Buyurtma qoʻshish
            </Button>
          </span>
          <SettingsLink />
        </div>
      </header>

      {error && !data ? (
        <StateBlock alert art="xato" title="Maʼlumot yuklanmadi" action={{ label: "Qayta urinish", icon: <StudioIcon name="refresh-cw" />, onClick: () => setNonce((n) => n + 1) }}>
          Internet aloqasini tekshiring. Kiritilgan buyurtmalar serverda saqlangan.
        </StateBlock>
      ) : !data ? (
        <Skeleton />
      ) : (
        <>
          <Hero data={data} capacity={ctx?.studio.dailyCapacity ?? 3} />
          <section className="ds-kpis ds-mobile-only" aria-label="Asosiy koʻrsatkichlar">
            <article className="ds-kpi" data-tone="inverse">
              <h2 className="ds-caps">Bu oy tushum</h2>
              <p className="ds-kpi-val">
                <b>{groupThousands(data.month.paid)}</b>
                <span>soʻm</span>
              </p>
              <Delta month={data.month} />
              <MiniBars points={data.revenue.months.slice(-6)} />
            </article>
            {/* money-due colour only when something is actually owed — an amber "0" reads as a warning */}
            <article className="ds-kpi" data-tone={data.debt.total > 0 ? "due" : undefined}>
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
              <Revenue data={data} />
              <div className="ds-dash-cols ds-desktop-only">
                <Next7 data={data} onOpen={(id) => setLayer({ kind: "order", id })} />
                <DebtCard data={data} onOpen={(id) => setLayer({ kind: "order", id })} onRemind={() => setRemind(data.debt.overdue.items)} />
              </div>
              <div className="ds-cols ds-mobile-only">
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
      {remind && <BulkRemind title="Kechikkanlarga eslatma" orders={remind} onClose={() => setRemind(null)} />}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

/* ── Desktop (Figma S2 · Dashboard 9:3) ── */

/* Hero · Asosiy koʻrsatkichlar (507:11655): white r24 card, head label + period pill, four KPI tiles
   (bg/surface r16: icon/muted 16 + Label/Strong · value H1 28 + unit · white r12 tray with a mini viz) */
function Hero({ data, capacity }: { data: Dash; capacity: number }) {
  const t = data.today;
  const period = `${cap1(monthOf(t))} ${t.slice(0, 4)}`;
  const hasMoney = data.month.paid > 0 || data.month.prevPaid > 0;
  return (
    <section className="ds-kpihero ds-desktop-only" aria-labelledby="hero-h">
      <div className="ds-hero-head">
        <h2 id="hero-h">Asosiy koʻrsatkichlar</h2>
        <span className="ds-hero-pill">{hasMoney ? `${period} · ${prevMonthOf(t)}ga nisbatan` : period}</span>
      </div>
      <div className="ds-hero-tiles">
        <Kpi icon="wallet" title="Bu oy tushum" value={data.month.paid} unit="soʻm" empty={!hasMoney} hint="Birinchi toʻlovdan keyin koʻrinadi">
          <MonthBars data={data} />
        </Kpi>
        <Kpi icon="clock" title="Qoldiq" value={data.debt.total} unit="soʻm" tone="due" empty={data.debt.total <= 0} hint="Qarzdorlik yoʻq">
          <Aging data={data} legend="kpi" />
        </Kpi>
        <Kpi
          icon="calendar"
          title="Keyingi 30 kun"
          value={data.next30Count}
          unit="tadbir"
          empty={data.next30Count === 0 && !data.next30.some((d) => d.blocked)}
          hint={data.setup.hasOrders ? "Keyingi 30 kunda tadbir yoʻq" : "Band kunlarni kalendarda belgilang"}
          emptyViz={<DayTicks days={data.next30} capacity={capacity} muted />}
        >
          <DayTicks days={data.next30} capacity={capacity} />
        </Kpi>
        <Kpi
          icon="clipboard-text"
          title="Yangi buyurtmalar"
          value={data.newOrders.count}
          unit="ta · bu oy"
          empty={data.newOrders.count === 0}
          hint={data.setup.hasOrders ? "Bu oy hali yangi buyurtma yoʻq" : "Birinchi buyurtmani qoʻshing"}
          badge={data.newOrders.count > 0 && data.newOrders.deltaPct !== null ? <DeltaPill pct={data.newOrders.deltaPct} /> : null}
        >
          <Advances data={data} />
        </Kpi>
      </div>
    </section>
  );
}

function Kpi({
  icon,
  title,
  value,
  unit,
  tone,
  empty,
  hint,
  badge,
  emptyViz,
  children,
}: {
  icon: "wallet" | "clock" | "calendar" | "clipboard-text";
  title: string;
  value: number;
  unit: string;
  tone?: "due";
  empty: boolean;
  hint: string;
  badge?: ReactNode;
  emptyViz?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="ds-ktile" data-empty={empty || undefined}>
      <div className="ds-tile-main">
        <h3>
          <StudioIcon name={icon} variant="Filled" size={16} />
          <span>{title}</span>
          {badge}
        </h3>
        <p className="ds-tile-val" data-tone={!empty ? tone : undefined}>
          <b>{groupThousands(value)}</b>
          <span>{unit}</span>
        </p>
      </div>
      <div className="ds-tile-tray">
        {empty ? (
          <>
            {emptyViz ?? <span className="ds-track" aria-hidden />}
            <p className="ds-body-sm ds-tertiary">{hint}</p>
          </>
        ) : (
          children
        )}
      </div>
    </article>
  );
}

function DeltaPill({ pct }: { pct: number }) {
  const down = pct < 0;
  return (
    <span className="ds-delta-pill" data-down={down || undefined} title="Oyning shu kunigacha, oʻtgan oyning xuddi shu kunlari bilan">
      {down ? "↓" : "↑"} {Math.abs(pct)}%
    </span>
  );
}

/* Bu oy tushum: this month vs the same days of last month, two bars on a shared scale */
function MonthBars({ data }: { data: Dash }) {
  const max = Math.max(1, data.month.paid, data.month.prevPaid);
  const rows = [
    { label: cap1(monthOf(data.today)), v: data.month.paid, now: true },
    { label: cap1(prevMonthOf(data.today)), v: data.month.prevPaid, now: false },
  ];
  return (
    <div className="ds-mbars">
      {rows.map((r) => (
        <div key={r.label} data-now={r.now || undefined}>
          <span>{r.label}</span>
          <span className="ds-mbar" aria-hidden>
            <i style={{ width: `${(r.v / max) * 100}%` }} />
          </span>
          <span>{compactSum(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

/* Qoldiq aging: overdue (danger) · due within 7 days (warning) · later (muted) */
function Aging({ data, legend }: { data: Dash; legend: "kpi" | "card" }) {
  const over = data.debt.overdue.total;
  const week = data.debt.week.total;
  const later = Math.max(0, data.debt.total - over - week);
  const parts = [
    { k: "over", v: over, label: legend === "kpi" ? `${compactSum(over)} kechikkan` : `Kechikkan ${compactSum(over)}` },
    { k: "week", v: week, label: legend === "kpi" ? `${compactSum(week)} 7 kunda` : `Haftada ${compactSum(week)}` },
    { k: "later", v: later, label: `${compactSum(later)} keyin` },
  ].filter((p) => p.v > 0);
  const shown = legend === "card" ? parts.filter((p) => p.k !== "later") : parts;
  return (
    <div className="ds-aging" data-variant={legend}>
      <span className="ds-aging-bar" aria-hidden>
        {parts.map((p) => (
          <i key={p.k} data-k={p.k} style={{ flexGrow: p.v }} />
        ))}
      </span>
      {shown.length > 0 && (
        <span className="ds-legend-dots">
          {shown.map((p) => (
            <span key={p.k} data-k={p.k}>
              {p.label}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/* Keyingi 30 kun: one tick per day — Band (booked or closed) · 1 joy · Boʻsh */
function DayTicks({ days, capacity, muted }: { days: Dash["next30"]; capacity: number; muted?: boolean }) {
  const st = (d: Dash["next30"][number]) => {
    const s = dayStatus(d.load, capacity, d.blocked);
    return s === "booked" || s === "blocked" ? "band" : s === "limited" ? "one" : "free";
  };
  return (
    <>
      <span className="ds-ticks" data-muted={muted || undefined} aria-hidden>
        {days.map((d) => (
          <i key={d.date} data-s={muted ? undefined : st(d)} />
        ))}
      </span>
      {!muted && (
        <span className="ds-legend-dots">
          <span data-k="band">Band</span>
          <span data-k="one">1 joy</span>
          <span data-k="free">Boʻsh</span>
        </span>
      )}
    </>
  );
}

/* Yangi buyurtmalar: share of this month's new orders that already paid an advance */
function Advances({ data }: { data: Dash }) {
  const n = data.newOrders;
  return (
    <>
      <span className="ds-track" aria-hidden>
        <i style={{ width: `${n.count ? (n.advanced / n.count) * 100 : 0}%` }} />
      </span>
      <span className="ds-legend-dots">
        <span data-k="glow" className="ds-body-sm">
          {n.advanced ? `${n.advanced} tasi avans berdi · ${compactSum(n.advancedSum)}` : "Hali avans yoʻq"}
        </span>
      </span>
    </>
  );
}

/* Keyingi 7 kun (9:99): date 56 · event dot · name 170 · place · balance */
function Next7({ data, onOpen }: { data: Dash; onOpen(id: string): void }) {
  return (
    <section className="ds-dcard" aria-labelledby="n7-h">
      <div className="ds-dcard-head">
        <h2 id="n7-h">Keyingi 7 kun</h2>
        <Link href="/panel/kalendar">Kalendar</Link>
      </div>
      {data.next7.length ? (
        <ul className="ds-n7">
          {data.next7.map((o) => {
            const urgent = o.balance > 0 && o.date <= addDays(data.today, 1);
            return (
              <li key={o.id}>
                <button type="button" onClick={() => onOpen(o.id)}>
                  <span className="n-date" data-today={o.date === data.today || undefined}>
                    {shortDay(o.date, data.today)}
                  </span>
                  <i className="n-dot" style={{ background: `var(--ds-event-${eventTone(o.eventType)}-dot)` }} aria-hidden />
                  <span className="n-client">{o.client}</span>
                  <span className="n-place">{[o.venue, eventLabel(o.eventType)].filter(Boolean).join(" · ")}</span>
                  {o.balance > 0 ? (
                    <span className="n-money" data-urgent={urgent || undefined}>
                      {groupThousands(o.balance)} soʻm
                    </span>
                  ) : (
                    <span className="n-money" data-paid>
                      Toʻlangan
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ds-body ds-secondary">Keyingi 7 kunda tadbir yoʻq</p>
      )}
    </section>
  );
}

/* Qoldiq (9:136): total · aging bar · overdue first, then the nearest balances · bulk reminder to the overdue */
function DebtCard({ data, onOpen, onRemind }: { data: Dash; onOpen(id: string): void; onRemind(): void }) {
  const rows = data.debt.items.slice(0, 3);
  return (
    <section className="ds-dcard ds-debtcard" aria-labelledby="debt-card-h">
      <div className="ds-dcard-head">
        <h2 id="debt-card-h">Qoldiq</h2>
        {data.debt.count > 0 && <Link href="/panel/buyurtmalar?view=debt">Hammasi</Link>}
      </div>
      <div className="ds-debt-total">
        <p className="ds-tile-val">
          <b>{groupThousands(data.debt.total)}</b>
          <span>soʻm</span>
        </p>
        {data.debt.total > 0 ? <Aging data={data} legend="card" /> : <p className="ds-body-sm ds-tertiary">Hamma buyurtmalar toʻliq toʻlangan</p>}
      </div>
      {rows.length > 0 && (
        <ul className="ds-debtors">
          {rows.map((o) => {
            const late = o.date < data.today ? daysLate(o.date, data.today) : 0;
            return (
              <li key={o.id}>
                <button type="button" onClick={() => onOpen(o.id)}>
                  <span className="d-who">
                    <span>{o.client}</span>
                    <span data-late={late > 0 || undefined}>{late > 0 ? `${late} kun kechikdi` : `${shortDay(o.date, data.today)} · tadbir`}</span>
                  </span>
                  <span className="d-sum">{groupThousands(o.balance)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {data.debt.overdue.count > 0 && (
        <button type="button" className="ds-btn ds-debt-remind" data-style="ghost" onClick={onRemind}>
          <span>Kechikkanlarga eslatma yuborish</span>
        </button>
      )}
    </section>
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
    <section className="ds-dcard ds-revenue ds-desktop-only" aria-labelledby="rev-h">
      <div className="ds-chart-head">
        <h2 id="rev-h" title={caption}>
          Tushum
        </h2>
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
            <span key={t} style={{ bottom: `calc(26px + 180px * ${t / max})` }}>
              {axisMln(t)}
            </span>
          ))}
        </div>
        <div className="ds-plot" role="list" aria-label={`Tushum, ${caption}`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <span key={t} className="ds-gridline" aria-hidden style={{ bottom: `calc(25px + 180px * ${t / max})` }} />
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
              <span className="ds-bar" aria-hidden style={{ height: `${(p.paid / max) * 180}px` }} />
              <span className="ds-xlabel" aria-hidden>
                {label(p)}
              </span>
              {i === shown && (
                <span className="ds-tip" aria-hidden style={{ bottom: `calc(26px + ${(p.paid / max) * 180}px + 8px)` }}>
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
    { done: true, title: "Studiya yaratildi", text: `${studio} · Toshkent`, action: null },
    { done: data.setup.hasBlockedDay, title: "Band kunlarni yoping", text: "Oldindan band sanalarni kalendarda belgilang", action: <Link className="ds-btn" data-style="secondary" data-on-card href="/panel/kalendar"><span>Kalendarni ochish</span></Link> },
    { done: data.setup.hasTeam, title: "Jamoani taklif qiling", text: "Menejer buyurtma qoʻshadi, obunani koʻrmaydi", action: <Link className="ds-btn" data-style="secondary" data-on-card href="/panel/sozlamalar"><span>Taklif qilish</span></Link> },
    { done: data.setup.hasOrders, title: "Birinchi buyurtmani qoʻshing", text: "Qoldiq va tushum shu yerda hisoblanadi", action: <Button variant="secondary" data-on-card onClick={onNew}>Buyurtma qoʻshish</Button> },
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="ds-panelcard ds-setup" aria-labelledby="setup-h">
      <div className="ds-cardhead ds-setup-head">
        <Illustration art="kalendar" className="ds-setup-art" />
        <div className="ds-stack" style={{ gap: "var(--ds-space-4)", flex: 1 }}>
          <h2 id="setup-h" className="ds-setup-title">
            Studiyani ishga tushiring
          </h2>
          <p className="ds-body-sm ds-secondary">
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
              {s.done && <StudioIcon name="check" size={16} className="ds-mobile-only" />}
              {s.done && <StudioIcon name="check-circle" variant="Filled" size={24} className="ds-desktop-only" />}
            </span>
            <div>
              <strong className="ds-body-medium">{s.title}</strong>
              <span className="ds-body-sm ds-secondary">{s.text}</span>
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
      <div className="ds-desktop-only ds-stack" style={{ gap: "var(--ds-space-24)" }} aria-busy>
        <span className="ds-skeleton" style={{ height: 268, borderRadius: "var(--ds-radius-xl)" }} />
        <span className="ds-skeleton" style={{ height: 338, borderRadius: "var(--ds-radius-xl)" }} />
      </div>
      <div className="ds-kpis ds-mobile-only" aria-busy>
        {[0, 1, 2].map((i) => (
          <span key={i} className="ds-skeleton" style={{ height: 130, borderRadius: "var(--ds-radius-2xl)" }} />
        ))}
      </div>
      <div className="ds-cols ds-mobile-only">
        <span className="ds-skeleton" style={{ height: 420, borderRadius: "var(--ds-radius-xl)" }} />
        <span className="ds-skeleton" style={{ height: 420, borderRadius: "var(--ds-radius-xl)" }} />
      </div>
    </>
  );
}
