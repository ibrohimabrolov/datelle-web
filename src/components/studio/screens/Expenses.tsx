"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { addMonths, MONTHS, WD_FULL, weekdayIdx } from "@/lib/dates";
import { eventLabel } from "@/lib/studio/calendar";
import { compactSum, niceMax } from "@/lib/studio/dashboard";
import { categoryLabel, LOW_MARGIN, marginPct, sharePct, type ExpenseCategory } from "@/lib/studio/expenses";
import { groupThousands } from "@/lib/studio/orders";
import { Button } from "../Button";
import { dataChanged, useDataVersion } from "../data";
import { ExpenseDetail, ExpenseForm, type Expense } from "../ExpenseForm";
import { StudioIcon } from "../icons";
import { Illustration, StateBlock } from "../StateBlock";
import { useStudio } from "../PanelProvider";
import { SettingsLink } from "../Shell";
import { Toast, type ToastMsg } from "../Toast";

type EventRow = { id: string; client: string; venue: string | null; eventType: string; date: string; total: number; paid: number; expense: number; profit: number; count: number };
type Overview = {
  today: string;
  month: string;
  current: boolean;
  kpi: { revenue: number; prevRevenue: number; expense: number; prevExpense: number; profit: number; prevProfit: number; events: number; perEvent: number };
  categories: { category: ExpenseCategory; sum: number; count: number }[];
  chart: { month: string; revenue: number; expense: number }[];
  count: number;
  items: Expense[];
  events: EventRow[];
  hasAny: boolean;
};

const SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
const cap1 = (s: string) => s[0].toUpperCase() + s.slice(1);
const mName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1];
const mLabel = (ym: string) => `${cap1(mName(ym))} ${ym.slice(0, 4)}`;
const dShort = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const axisMln = (n: number) => String(Math.round((n / 1_000_000) * 10) / 10).replace(".", ",");
const LIST = 6;
const EVENTS = 4;

/* Figma 10 · Xarajatlar (S9, 487:9121) — owner only. Month view is cash based (Tushum = payments received). */
export function ExpensesScreen() {
  const ctx = useStudio();
  const version = useDataVersion();
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [layer, setLayer] = useState<{ kind: "new" } | { kind: "edit"; expense: Expense } | { kind: "view"; id: string } | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [allItems, setAllItems] = useState(false);
  const [allEvents, setAllEvents] = useState(false);

  useEffect(() => {
    if (!ctx || ctx.studio.role !== "owner") return;
    let alive = true;
    api<Overview>(`/api/panel/expenses${month ? `?month=${month}` : ""}`)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [ctx, month, version, nonce]);

  const shown = data?.month ?? month;
  const go = (n: number) => {
    if (!shown) return;
    setMonth(addMonths(shown, n));
    setAllItems(false);
    setAllEvents(false);
  };
  const empty = data && !data.hasAny;

  if (ctx && ctx.studio.role !== "owner") {
    return (
      <StateBlock art="qulf" title="Faqat studiya egasi uchun">
        Xarajat va foyda raqamlarini faqat studiya egasi koʻradi.
      </StateBlock>
    );
  }

  return (
    <>
      <header className="ds-list-head" data-wide>
        <h1 className="ds-h1">Xarajatlar</h1>
        <div className="ds-cal-actions" style={{ gap: "var(--ds-space-16)" }}>
          <div className="ds-xp-period">
            <button className="ds-iconbtn" data-style="secondary" onClick={() => go(-1)} disabled={!shown} aria-label="Oldingi oy">
              <StudioIcon name="chevron-left" />
            </button>
            <span className="ds-body-medium" aria-live="polite">
              {shown ? mLabel(shown) : " "}
            </span>
            <button className="ds-iconbtn" data-style="secondary" onClick={() => go(1)} disabled={!data || data.current} aria-label="Keyingi oy">
              <StudioIcon name="chevron-right" />
            </button>
          </div>
          <span className="ds-desktop-only">
            <Button icon={<StudioIcon name="plus" />} onClick={() => setLayer({ kind: "new" })} disabled={!ctx || Boolean(error && !data)}>
              Xarajat qoʻshish
            </Button>
          </span>
          <SettingsLink />
        </div>
      </header>

      {error && !data ? (
        <StateBlock alert art="xato" title="Maʼlumot yuklanmadi" action={{ label: "Qayta urinish", icon: <StudioIcon name="refresh-cw" />, onClick: () => setNonce((n) => n + 1) }}>
          Internet aloqasini tekshiring. Kiritilgan xarajatlar serverda saqlangan.
        </StateBlock>
      ) : !data ? (
        <div className="ds-stack" style={{ gap: "var(--ds-space-24)" }} aria-busy>
          <span className="ds-skeleton" style={{ height: 276, borderRadius: "var(--ds-radius-xl)" }} />
          <span className="ds-skeleton" style={{ height: 408, borderRadius: "var(--ds-radius-xl)" }} />
        </div>
      ) : empty ? (
        <Empty onNew={() => setLayer({ kind: "new" })} />
      ) : (
        <>
          <Hero data={data} />
          <div className="ds-xp-row">
            <Chart data={data} />
            <Categories data={data} />
          </div>
          <div className="ds-xp-row">
            <Recent data={data} all={allItems} onAll={() => setAllItems((v) => !v)} onOpen={(id) => setLayer({ kind: "view", id })} />
            <EventProfits data={data} all={allEvents} onAll={() => setAllEvents((v) => !v)} />
          </div>
        </>
      )}

      <button className="ds-fab" aria-label="Xarajat qoʻshish" onClick={() => setLayer({ kind: "new" })}>
        <StudioIcon name="plus" size={24} />
      </button>

      {(layer?.kind === "new" || layer?.kind === "edit") && (
        <ExpenseForm
          expense={layer.kind === "edit" ? layer.expense : undefined}
          onClose={() => setLayer(null)}
          onSaved={(e, created) => {
            setLayer(created ? null : { kind: "view", id: e.id });
            if (created && shown && e.date.slice(0, 7) !== shown) setMonth(e.date.slice(0, 7));
            dataChanged();
            setToast({ id: Date.now(), text: created ? "Xarajat qoʻshildi" : "Saqlandi", action: created ? { label: "Ochish", run: () => setLayer({ kind: "view", id: e.id }) } : undefined });
          }}
        />
      )}
      {layer?.kind === "view" && (
        <ExpenseDetail
          id={layer.id}
          onClose={() => setLayer(null)}
          onEdit={(e) => setLayer({ kind: "edit", expense: e })}
          onDeleted={(e) => {
            setLayer(null);
            dataChanged();
            setToast({
              id: Date.now(),
              text: "Xarajat oʻchirildi",
              action: {
                label: "Bekor qilish",
                run: async () => {
                  await api(`/api/panel/expenses/${e.id}/restore`, { body: {} });
                  dataChanged();
                },
              },
            });
          }}
        />
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

/* ── Hero · Asosiy koʻrsatkichlar (558:11909) ── */
function Hero({ data }: { data: Overview }) {
  const k = data.kpi;
  const prev = addMonths(data.month, -1);
  const hasPrev = k.prevRevenue > 0 || k.prevExpense > 0;
  const cats = data.categories;
  const top = cats.slice(0, 2);
  const perEvent = data.events.map((e) => e.expense);
  return (
    <section className="ds-kpihero" aria-labelledby="xp-hero-h">
      <div className="ds-hero-head">
        <h2 id="xp-hero-h">Asosiy koʻrsatkichlar</h2>
        <span className="ds-hero-pill">{hasPrev ? `${mLabel(data.month)} · ${mName(prev)}ga nisbatan` : mLabel(data.month)}</span>
      </div>
      <div className="ds-hero-tiles">
        <Tile icon="trend-up" title="Sof foyda" value={k.profit} empty={k.revenue === 0 && k.expense === 0} hint="Tushum va xarajatdan hisoblanadi">
          <TwoBars rows={[{ label: cap1(mName(data.month)), v: k.profit, now: true }, { label: cap1(mName(prev)), v: k.prevProfit }]} />
        </Tile>
        <Tile icon="wallet" title="Tushum" value={k.revenue} empty={k.revenue === 0} hint="Bu oy toʻlov olinmagan">
          <span className="ds-xp-split" aria-hidden>
            {k.profit > 0 && <i data-k="profit" style={{ flexGrow: k.profit }} />}
            <i data-k="cost" style={{ flexGrow: Math.min(k.expense, k.revenue) || 1 }} />
          </span>
          <span className="ds-legend-dots">
            <span data-k="xp-profit">
              {k.profit > 0 ? `${compactSum(k.profit)} foyda · ${sharePct(k.profit, k.revenue)}%` : "Foyda yoʻq"}
            </span>
            <span data-k="later">{compactSum(k.expense)} xarajat</span>
            {k.events > 0 && <span data-k="none">{k.events} ta tadbir</span>}
          </span>
        </Tile>
        <Tile icon="receipt" title="Xarajat" value={k.expense} empty={k.expense === 0} hint="Bu oy xarajat yozilmagan">
          <span className="ds-xp-split" aria-hidden>
            {cats.map((c) => (
              <i key={c.category} data-cat={c.category} style={{ flexGrow: c.sum }} />
            ))}
          </span>
          <span className="ds-legend-dots">
            {top.map((c) => (
              <span key={c.category} data-cat={c.category}>
                {categoryLabel(c.category)} {sharePct(c.sum, k.expense)}%
              </span>
            ))}
            {cats.length > 2 && <span data-k="none">+{cats.length - 2} kategoriya</span>}
          </span>
        </Tile>
        <Tile icon="dollar-circle" title="Tadbir boshiga" value={k.perEvent} empty={k.events === 0 || k.expense === 0} hint={k.events ? "Xarajatni tadbirga bogʻlang" : "Bu oy tadbir yoʻq"}>
          <EventBars values={perEvent} />
          <p className="ds-body-sm ds-secondary">
            {k.events} tadbir · oʻrtacha {compactSum(k.perEvent)}
          </p>
        </Tile>
      </div>
    </section>
  );
}

function Tile({ icon, title, value, empty, hint, children }: { icon: "trend-up" | "wallet" | "receipt" | "dollar-circle"; title: string; value: number; empty: boolean; hint: string; children: ReactNode }) {
  return (
    <article className="ds-ktile ds-xp-tile" data-empty={empty || undefined}>
      <div className="ds-tile-main">
        <h3>
          <StudioIcon name={icon} variant="Filled" size={16} />
          <span>{title}</span>
        </h3>
        <p className="ds-tile-val" data-tone={!empty && value < 0 ? "due" : undefined}>
          <b>{value < 0 ? `−${groupThousands(-value)}` : groupThousands(value)}</b>
          <span>soʻm</span>
        </p>
      </div>
      <div className="ds-tile-tray">
        {empty ? (
          <>
            <span className="ds-track" aria-hidden />
            <p className="ds-body-sm ds-tertiary">{hint}</p>
          </>
        ) : (
          children
        )}
      </div>
    </article>
  );
}

/* Sof foyda: this month vs last, two bars on one scale (Dashboard MonthBars look) */
function TwoBars({ rows }: { rows: { label: string; v: number; now?: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.v)));
  return (
    <div className="ds-mbars" data-xp>
      {rows.map((r) => (
        <div key={r.label} data-now={r.now || undefined}>
          <span>{r.label}</span>
          <span className="ds-mbar" aria-hidden>
            <i style={{ width: `${(Math.max(0, r.v) / max) * 100}%` }} data-neg={r.v < 0 || undefined} />
          </span>
          <span>{r.v < 0 ? `−${compactSum(-r.v)}` : compactSum(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

/* Tadbir boshiga: one column per event of the month, height = its linked expenses */
function EventBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="ds-xp-cols" aria-hidden>
      {values.slice(0, 31).map((v, i) => (
        <i key={i} style={{ height: `${Math.max(3, (v / max) * 28)}px` }} />
      ))}
    </span>
  );
}

/* ── Tushum va xarajat (490:9092): 6 months, two bars per month, profit tooltip ── */
function Chart({ data }: { data: Overview }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = data.chart;
  const max = useMemo(() => niceMax(Math.max(...pts.flatMap((p) => [p.revenue, p.expense]))), [pts]);
  const ticks = [0, 1, 2, 3].map((i) => (max / 3) * i);
  const shown = hover ?? pts.length - 1;
  const h = (v: number) => `${(v / max) * 180}px`;
  return (
    <section className="ds-dcard ds-xp-chart" aria-labelledby="xp-chart-h">
      <div className="ds-chart-head">
        <h2 id="xp-chart-h">Tushum va xarajat</h2>
        <span className="ds-xp-legend" aria-hidden>
          <span data-k="rev">Tushum</span>
          <span data-k="exp">Xarajat</span>
        </span>
      </div>
      <div className="ds-chart ds-xp-plotwrap">
        <div className="ds-yaxis" aria-hidden>
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `calc(26px + 180px * ${t / max})` }}>
              {axisMln(t)}
            </span>
          ))}
        </div>
        <div className="ds-plot ds-xp-plot" role="list" aria-label="Tushum va xarajat, oxirgi 6 oy, mln soʻm" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <span key={t} className="ds-gridline" aria-hidden style={{ bottom: `calc(25px + 180px * ${t / max})` }} />
          ))}
          {pts.map((p, i) => {
            const profit = p.revenue - p.expense;
            return (
              <div
                key={p.month}
                className="ds-col ds-xp-col"
                role="listitem"
                tabIndex={0}
                data-now={i === pts.length - 1 || undefined}
                aria-label={`${mLabel(p.month)}: tushum ${groupThousands(p.revenue)}, xarajat ${groupThousands(p.expense)}, foyda ${groupThousands(profit)} soʻm`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <span className="ds-xp-bars" aria-hidden>
                  <i data-k="rev" style={{ height: h(p.revenue) }} />
                  <i data-k="exp" style={{ height: h(p.expense) }} />
                </span>
                <span className="ds-xlabel" aria-hidden>
                  {SHORT[Number(p.month.slice(5, 7)) - 1]}
                </span>
                {i === shown && (p.revenue > 0 || p.expense > 0) && (
                  <span className="ds-tip" aria-hidden style={{ bottom: `calc(26px + ${h(Math.max(p.revenue, p.expense))} + 8px)` }}>
                    {hover === null ? "" : `${cap1(mName(p.month))} · `}Foyda {profit < 0 ? `−${compactSum(-profit)}` : compactSum(profit)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Kategoriyalar · May (490:9141) ── */
function Categories({ data }: { data: Overview }) {
  const total = data.kpi.expense;
  const max = Math.max(1, ...data.categories.map((c) => c.sum));
  return (
    <section className="ds-dcard ds-xp-side" aria-labelledby="xp-cat-h">
      <div className="ds-dcard-head">
        <h2 id="xp-cat-h">Kategoriyalar · {cap1(mName(data.month))}</h2>
      </div>
      <div className="ds-xp-total">
        <span className="ds-label ds-secondary">Jami xarajat</span>
        <span className="ds-h2">{groupThousands(total)} soʻm</span>
      </div>
      {data.categories.length ? (
        <ul className="ds-xp-cats">
          {data.categories.map((c) => (
            <li key={c.category}>
              <div>
                <span>{categoryLabel(c.category)}</span>
                <span>
                  {groupThousands(c.sum)} <small>{sharePct(c.sum, total)}%</small>
                </span>
              </div>
              <span className="ds-xp-track" aria-hidden>
                <i data-cat={c.category} style={{ width: `${(c.sum / max) * 90}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ds-body ds-secondary">Bu oy xarajat yozilmagan</p>
      )}
    </section>
  );
}

/* ── Oxirgi xarajatlar (490:9190) ── */
function Recent({ data, all, onAll, onOpen }: { data: Overview; all: boolean; onAll(): void; onOpen(id: string): void }) {
  const rows = all ? data.items : data.items.slice(0, LIST);
  return (
    <section className="ds-dcard ds-xp-list" aria-labelledby="xp-list-h">
      <div className="ds-dcard-head">
        <h2 id="xp-list-h">Oxirgi xarajatlar</h2>
        {data.count > LIST && (
          <button type="button" className="ds-xp-link" onClick={onAll} aria-expanded={all}>
            {all ? "Qisqaroq" : `Hammasi · ${data.count}`}
          </button>
        )}
      </div>
      {rows.length ? (
        <table className="ds-table ds-xp-table">
          <thead>
            <tr>
              <th className="x-date">Sana</th>
              <th>Xarajat</th>
              <th className="x-cat">Kategoriya</th>
              <th className="x-sum" data-num>
                Summa
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr
                key={e.id}
                tabIndex={0}
                onClick={() => onOpen(e.id)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), onOpen(e.id))}
                aria-label={`${e.title}, ${groupThousands(e.amount)} soʻm`}
              >
                <td>
                  <span className="ds-cell-main">{dShort(e.date)}</span>
                  <span className="ds-cell-sub">{WD_FULL[weekdayIdx(e.date)]}</span>
                </td>
                <td>
                  <span className="ds-cell-main">{e.title}</span>
                  <span className="ds-cell-sub">{[e.order ? [e.order.client, e.order.venue].filter(Boolean).join(" · ") : "Umumiy", e.paidBy?.name.split(" ")[0]].filter(Boolean).join(" · ")}</span>
                </td>
                <td>
                  <CategoryPill category={e.category} />
                </td>
                <td className="c-sum" data-num>
                  {groupThousands(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="ds-body ds-secondary">Bu oy xarajat yozilmagan</p>
      )}
    </section>
  );
}

export function CategoryPill({ category }: { category: ExpenseCategory }) {
  return (
    <span className="ds-xp-pill" data-cat={category}>
      {categoryLabel(category)}
    </span>
  );
}

/* ── Tadbirlar foydasi (490:9254): order total − linked expenses ── */
function EventProfits({ data, all, onAll }: { data: Overview; all: boolean; onAll(): void }) {
  const rows = all ? data.events : data.events.slice(0, EVENTS);
  return (
    <section className="ds-dcard ds-xp-side" aria-labelledby="xp-ev-h">
      <div className="ds-dcard-head">
        <h2 id="xp-ev-h">Tadbirlar foydasi</h2>
        {data.events.length > EVENTS && (
          <button type="button" className="ds-xp-link" onClick={onAll} aria-expanded={all}>
            {all ? "Qisqaroq" : "Hammasi"}
          </button>
        )}
      </div>
      {rows.length ? (
        <ul className="ds-xp-events">
          {rows.map((e) => {
            const m = marginPct(e.total, e.expense);
            const low = m !== null && m < LOW_MARGIN;
            return (
              <li key={e.id}>
                <div className="x-top">
                  <span className="x-who">
                    <span>{e.client}</span>
                    <span>{[e.venue, eventLabel(e.eventType), dShort(e.date)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="x-profit" data-low={low || undefined}>
                    <span>{e.profit < 0 ? `−${groupThousands(-e.profit)}` : groupThousands(e.profit)}</span>
                    {m !== null && <span>marja {m}%</span>}
                  </span>
                </div>
                <p className="ds-body-sm ds-tertiary">
                  Tushum {groupThousands(e.total)} · xarajat {groupThousands(e.expense)}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ds-body ds-secondary">Bu oy tadbir yoʻq</p>
      )}
    </section>
  );
}

/* ── S9 · Xarajatlar · boʻsh (499:10752) ── */
function Empty({ onNew }: { onNew(): void }) {
  const steps = [
    { title: "Xarajatni yozing", text: "Summa va kategoriya — 10 soniya" },
    { title: "Tadbirga bogʻlang", text: "Qaysi toʻy yoki bazm uchun" },
    { title: "Foydani koʻring", text: "Har tadbir va har oy boʻyicha" },
  ];
  return (
    <section className="ds-xp-empty" aria-labelledby="xp-empty-h">
      <Illustration art="pul" className="ds-xp-empty-art" />
      <div className="ds-xp-empty-text">
        <h2 id="xp-empty-h">
          Har bir tadbirning
          <br />
          sof foydasini koʻring
        </h2>
        <p className="ds-body-sm ds-secondary">Gul, transport va ish haqini yozib boring. Tushumni Floreal buyurtmalardan oʻzi oladi — foyda avtomatik hisoblanadi.</p>
      </div>
      <Button onClick={onNew}>Xarajat qoʻshish</Button>
      <ol className="ds-xp-steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span aria-hidden>{i + 1}</span>
            <div>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
