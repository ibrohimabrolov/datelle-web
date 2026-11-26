"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { MONTHS } from "@/lib/dates";
import { eventLabel } from "@/lib/studio/calendar";
import { PROP_CATEGORIES, propCategory, type PropCategory, type PropState } from "@/lib/studio/props";
import { Button } from "../Button";
import { dataChanged, useDataVersion } from "../data";
import { StudioIcon, type StudioIconName } from "../icons";
import { PropDetail, PropForm, ReturnPanel } from "../PropForms";
import { Illustration, StateBlock } from "../StateBlock";
import { useStudio } from "../PanelProvider";
import { SettingsLink } from "../Shell";
import { Toast, type ToastMsg } from "../Toast";

export type PropItem = { id: string; name: string; code: string; category: PropCategory; note: string | null; total: number; repair: number; out: number; overdue: number; stock: number; state: PropState };
type Group = { orderId: string; client: string; venue: string | null; eventType: string; date: string; overdue: boolean; lines: { name: string; qty: number }[] };
type Shortage = { date: string; need: number; have: number; missing: number; orders: number; propId: string; name: string };
type Overview = {
  today: string;
  hasAny: boolean;
  items: PropItem[];
  counts: Record<string, number>;
  kpi: { out: number; leaving: number; returning: number; total: number; stock: number; repair: number; repairKinds: number; missing: number; next: Shortage | null };
  shortages: Shortage[];
  leaving: Group[];
  returning: Group[];
};

export const dShort = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
export const STATE_LABEL: Record<PropState, string> = { qaytmagan: "Qaytmagan", kam: "Kam qoldi", tadbirda: "Tadbirda", tamirda: "Taʼmirda", omborda: "Omborda" };
export const catIcon = (c: string) => propCategory(c).icon as StudioIconName;

/* Figma 08 · Rekvizit (S7, 487:8713) — owner and manager */
export function RekvizitScreen() {
  const ctx = useStudio();
  const version = useDataVersion();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [cat, setCat] = useState<PropCategory | null>(null);
  const [q, setQ] = useState("");
  const [layer, setLayer] = useState<{ kind: "new" } | { kind: "edit"; item: PropItem } | { kind: "item"; id: string; book?: boolean } | { kind: "return"; orderId: string } | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    if (!ctx) return;
    let alive = true;
    api<Overview>("/api/panel/props")
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [ctx, version, nonce]);

  const needle = q.trim().toLowerCase();
  const rows = (data?.items ?? []).filter((i) => (!cat || i.category === cat) && (!needle || `${i.name} ${i.code}`.toLowerCase().includes(needle)));

  return (
    <>
      <header className="ds-list-head" data-wide>
        <h1 className="ds-h1">Rekvizit</h1>
        <div className="ds-cal-actions">
          <span className="ds-desktop-only">
            <Button icon={<StudioIcon name="plus" />} onClick={() => setLayer({ kind: "new" })} disabled={!ctx || Boolean(error && !data)}>
              Rekvizit qoʻshish
            </Button>
          </span>
          <SettingsLink />
        </div>
      </header>

      {error && !data ? (
        <StateBlock alert art="xato" title="Maʼlumot yuklanmadi" action={{ label: "Qayta urinish", icon: <StudioIcon name="refresh-cw" />, onClick: () => setNonce((n) => n + 1) }}>
          Internet aloqasini tekshiring. Kiritilgan rekvizitlar serverda saqlangan.
        </StateBlock>
      ) : !data ? (
        <div className="ds-stack" style={{ gap: "var(--ds-space-24)" }} aria-busy>
          <span className="ds-skeleton" style={{ height: 248, borderRadius: "var(--ds-radius-xl)" }} />
          <span className="ds-skeleton" style={{ height: 640, borderRadius: "var(--ds-radius-xl)" }} />
        </div>
      ) : !data.hasAny ? (
        <Empty onNew={() => setLayer({ kind: "new" })} />
      ) : (
        <>
          <Hero data={data} />
          <div className="ds-xp-row">
            <section className="ds-dcard ds-rk-store" aria-labelledby="rk-store-h">
              <div className="ds-dcard-head">
                <h2 id="rk-store-h">Ombor</h2>
                <div className="ds-search" role="search">
                  <StudioIcon name="search" />
                  <input type="search" aria-label="Buyum qidirish" placeholder="Buyum qidirish" value={q} onChange={(e) => setQ(e.target.value)} />
                  {q && (
                    <button type="button" className="ds-search-clear" aria-label="Qidiruvni tozalash" onClick={() => setQ("")}>
                      <StudioIcon name="cross" size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="ds-chips ds-rk-chips" role="radiogroup" aria-label="Kategoriya">
                <button type="button" role="radio" className="ds-chip-btn" aria-checked={!cat} onClick={() => setCat(null)}>
                  Hammasi
                </button>
                {PROP_CATEGORIES.filter((c) => data.counts[c.slug]).map((c) => (
                  <button key={c.slug} type="button" role="radio" className="ds-chip-btn" aria-checked={cat === c.slug} onClick={() => setCat(c.slug)}>
                    {c.label} <span className="ds-rk-count">{data.counts[c.slug]}</span>
                  </button>
                ))}
              </div>
              {rows.length ? (
                <table className="ds-table ds-rk-table">
                  <thead>
                    <tr>
                      <th>Buyum</th>
                      <th className="r-n" data-num>
                        Jami
                      </th>
                      <th className="r-n" data-num>
                        Omborda
                      </th>
                      <th className="r-n" data-num>
                        Tadbirda
                      </th>
                      <th className="r-st">Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => (
                      <tr
                        key={i.id}
                        tabIndex={0}
                        onClick={() => setLayer({ kind: "item", id: i.id })}
                        onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setLayer({ kind: "item", id: i.id }))}
                        aria-label={`${i.name}: jami ${i.total}, omborda ${i.stock}, holat ${STATE_LABEL[i.state]}`}
                      >
                        <td>
                          <span className="ds-cell-person">
                            <span className="ds-rk-ic" aria-hidden>
                              <StudioIcon name={catIcon(i.category)} variant="Filled" size={20} />
                            </span>
                            <span>
                              <span className="ds-cell-main">{i.name}</span>
                              <span className="ds-cell-sub">
                                {i.code} · {propCategory(i.category).label}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td data-num>{i.total}</td>
                        <td data-num>{i.stock}</td>
                        <td data-num>{i.out}</td>
                        <td>
                          <StatePill item={i} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="ds-rk-none">
                  <StateBlock art="topilmadi" title="Hech narsa topilmadi" action={{ label: "Qidiruvni tozalash", onClick: () => (setQ(""), setCat(null)) }}>
                    {needle ? `«${q.trim()}» boʻyicha buyum yoʻq. Nomi yoki kodini tekshiring.` : "Bu kategoriyada buyum yoʻq."}
                  </StateBlock>
                </div>
              )}
            </section>
            <Today data={data} onItem={(id) => setLayer({ kind: "item", id })} onReturn={(orderId) => setLayer({ kind: "return", orderId })} />
          </div>
        </>
      )}

      <button className="ds-fab" aria-label="Rekvizit qoʻshish" onClick={() => setLayer({ kind: "new" })}>
        <StudioIcon name="plus" size={24} />
      </button>

      {(layer?.kind === "new" || layer?.kind === "edit") && (
        <PropForm
          item={layer.kind === "edit" ? layer.item : undefined}
          onClose={() => setLayer(null)}
          onSaved={(p, created) => {
            setLayer(created ? null : { kind: "item", id: p.id });
            dataChanged();
            setToast({ id: Date.now(), text: created ? "Rekvizit qoʻshildi" : "Saqlandi", action: created ? { label: "Ochish", run: () => setLayer({ kind: "item", id: p.id }) } : undefined });
          }}
        />
      )}
      {layer?.kind === "item" && (
        <PropDetail
          id={layer.id}
          canDelete={ctx?.studio.role === "owner"}
          onClose={() => setLayer(null)}
          onEdit={(p) => setLayer({ kind: "edit", item: p })}
          onReturn={(orderId) => setLayer({ kind: "return", orderId })}
          toast={setToast}
        />
      )}
      {layer?.kind === "return" && (
        <ReturnPanel
          orderId={layer.orderId}
          onClose={() => setLayer(null)}
          onDone={(n) => {
            setLayer(null);
            dataChanged();
            setToast({ id: Date.now(), text: `Qabul qilindi · ${n} ta omborga` });
          }}
        />
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

export function StatePill({ item }: { item: Pick<PropItem, "state" | "repair" | "overdue"> }) {
  const n = item.state === "qaytmagan" ? item.overdue : item.state === "tamirda" ? item.repair : null;
  return (
    <span className="ds-xp-pill ds-rk-pill" data-state={item.state}>
      {STATE_LABEL[item.state]}
      {n ? ` · ${n}` : ""}
    </span>
  );
}

/* ── Hero · Asosiy koʻrsatkichlar ── */
function Hero({ data }: { data: Overview }) {
  const k = data.kpi;
  const maxMove = Math.max(1, k.leaving, k.returning);
  const n = k.next;
  return (
    <section className="ds-kpihero" aria-labelledby="rk-hero-h">
      <div className="ds-hero-head">
        <h2 id="rk-hero-h">Asosiy koʻrsatkichlar</h2>
        <span className="ds-hero-pill">Bugun · {dShort(data.today)}</span>
      </div>
      <div className="ds-hero-tiles">
        <Tile icon="truck" title="Hozir tadbirda" value={k.out} empty={k.out === 0 && k.leaving === 0} hint="Bugun hech narsa chiqmaydi">
          <div className="ds-mbars" data-xp>
            {[
              { label: "Chiqadi", v: k.leaving, now: true },
              { label: "Qaytadi", v: k.returning, now: false },
            ].map((r) => (
              <div key={r.label} data-now={r.now || undefined}>
                <span>{r.label}</span>
                <span className="ds-mbar" aria-hidden>
                  <i style={{ width: `${(r.v / maxMove) * 100}%` }} />
                </span>
                <span>{r.v} ta</span>
              </div>
            ))}
          </div>
        </Tile>
        <Tile icon="box" title="Jami buyum" value={k.total} empty={k.total === 0} hint="Buyumlar soni 0">
          <span className="ds-xp-split" aria-hidden>
            {k.stock > 0 && <i data-k="profit" style={{ flexGrow: k.stock }} />}
            {k.out > 0 && <i data-rk="out" style={{ flexGrow: k.out }} />}
            {k.repair > 0 && <i data-k="cost" style={{ flexGrow: k.repair }} />}
          </span>
          <span className="ds-legend-dots">
            <span data-k="xp-profit">{k.stock} omborda</span>
            <span data-rk="out">{k.out} tadbirda</span>
            {k.repair > 0 && <span data-k="later">{k.repair} taʼmirda</span>}
          </span>
        </Tile>
        <Tile icon="alert-triangle" title="Yetishmaydi" value={k.missing} tone={k.missing > 0 ? "due" : undefined} empty={!n} hint="30 kun ichida hammasi yetarli">
          {n && (
            <>
              <span className="ds-xp-split" aria-hidden>
                <i data-k="profit" style={{ flexGrow: n.have || 0.001 }} />
                <i data-rk="miss" style={{ flexGrow: n.missing }} />
              </span>
              <span className="ds-legend-dots">
                <span data-k="xp-profit">{n.have} bor</span>
                <span data-rk="miss">{n.missing} yetishmaydi</span>
                <span data-k="none">
                  {dShort(n.date)} · {n.name}
                </span>
              </span>
            </>
          )}
        </Tile>
        <Tile icon="wrench" title="Taʼmirda" value={k.repair} empty={k.repair === 0} hint="Taʼmirda buyum yoʻq">
          <span className="ds-xp-split" aria-hidden>
            {Array.from({ length: Math.min(k.repair, 12) }, (_, i) => (
              <i key={i} data-k="cost" style={{ flexGrow: 1 }} />
            ))}
          </span>
          <span className="ds-legend-dots">
            <span data-k="later">{k.repairKinds} xil buyum</span>
            <span data-k="none">Tuzatilgach omborga qaytaring</span>
          </span>
        </Tile>
      </div>
    </section>
  );
}

function Tile({ icon, title, value, tone, empty, hint, children }: { icon: StudioIconName; title: string; value: number; tone?: "due"; empty: boolean; hint: string; children: ReactNode }) {
  return (
    <article className="ds-ktile ds-xp-tile" data-empty={empty || undefined}>
      <div className="ds-tile-main">
        <h3>
          <StudioIcon name={icon} variant="Filled" size={16} />
          <span>{title}</span>
        </h3>
        <p className="ds-tile-val" data-tone={tone}>
          <b>{value}</b>
          <span>ta</span>
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

/* ── Bugun · 12-may: nearest shortage, what leaves today, what is due back ── */
function Today({ data, onItem, onReturn }: { data: Overview; onItem(id: string): void; onReturn(orderId: string): void }) {
  const n = data.kpi.next;
  const sum = (g: Group[]) => g.reduce((s, x) => s + x.lines.reduce((t, l) => t + l.qty, 0), 0);
  return (
    <section className="ds-dcard ds-xp-side ds-rk-today" aria-labelledby="rk-today-h">
      <div className="ds-dcard-head">
        <h2 id="rk-today-h">Bugun · {dShort(data.today)}</h2>
        <Link href="/panel/kalendar">Kalendar</Link>
      </div>
      {n && (
        <button type="button" className="ds-alert ds-rk-alert" data-tone="warning" onClick={() => onItem(n.propId)}>
          <span className="ds-alert-icon ds-rk-tri" aria-hidden>
            <StudioIcon name="alert-triangle" variant="Filled" size={20} />
          </span>
          <div>
            <b>
              {dShort(n.date)} · {n.missing} ta {n.name.toLowerCase()} yetishmaydi
            </b>
            <span>{n.orders > 1 ? `${n.orders} ta tadbir bir kunda: ${n.need} ta kerak, ${n.have} ta bor` : `${n.need} ta kerak, ${n.have} ta bor`}</span>
          </div>
        </button>
      )}
      <div className="ds-rk-sec">
        <p>
          <span className="ds-rk-tag" data-k="out">
            Chiqadi
          </span>
          <span>{data.leaving.length ? `${data.leaving.length} tadbir · ${sum(data.leaving)} buyum` : "Bugun chiqmaydi"}</span>
        </p>
        {data.leaving.map((g) => (
          <GroupCard key={g.orderId} g={g} meta={[g.venue, eventLabel(g.eventType)].filter(Boolean).join(" · ")} />
        ))}
      </div>
      <div className="ds-rk-sec">
        <p>
          <span className="ds-rk-tag" data-k="back">
            Qaytadi
          </span>
          <span>{data.returning.length ? `${data.returning.length} tadbir · ${sum(data.returning)} buyum` : "Qaytishi kerak boʻlgan yoʻq"}</span>
        </p>
        {data.returning.map((g) => (
          <GroupCard
            key={g.orderId}
            g={g}
            meta={[g.venue, eventLabel(g.eventType), dShort(g.date)].filter(Boolean).join(" · ")}
            badge={g.overdue ? <span className="ds-rk-late">{daysBetween(g.date, data.today) - 1} kun kechikdi</span> : null}
            onClick={() => onReturn(g.orderId)}
          />
        ))}
      </div>
    </section>
  );
}

function GroupCard({ g, meta, badge, onClick }: { g: Group; meta: string; badge?: ReactNode; onClick?(): void }) {
  const body = (
    <>
      <span className="r-top">
        <span>
          <span>{g.client}</span>
          <span>{meta}</span>
        </span>
        {badge}
      </span>
      <span className="r-lines">
        {g.lines.map((l) => (
          <span key={l.name}>
            <span>{l.name}</span>
            <b>× {l.qty}</b>
          </span>
        ))}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="ds-rk-group" onClick={onClick} aria-label={`${g.client}: qaytarishni qabul qilish`}>
      {body}
    </button>
  ) : (
    <div className="ds-rk-group">{body}</div>
  );
}

/* ── S7 · Rekvizit · boʻsh (494:9092) ── */
function Empty({ onNew }: { onNew(): void }) {
  const steps = [
    { title: "Buyum qoʻshing", text: "Nomi, soni va kategoriyasi" },
    { title: "Buyurtmaga biriktiring", text: "Qaysi tadbirga nechta ketadi" },
    { title: "Floreal kuzatadi", text: "Yetishmovchilik va qaytish vaqti" },
  ];
  return (
    <section className="ds-xp-empty" aria-labelledby="rk-empty-h">
      <Illustration art="rekvizit" className="ds-xp-empty-art" />
      <div className="ds-xp-empty-text">
        <h2 id="rk-empty-h">Rekvizitlaringizni bir joyga yigʻing</h2>
        <p className="ds-body-sm ds-secondary">Vaza, arka, shamdon — har birini bir marta kiriting. Qaysi tadbirga ketgani va qachon qaytishini Floreal oʻzi kuzatadi.</p>
      </div>
      <Button onClick={onNew}>Rekvizit qoʻshish</Button>
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
