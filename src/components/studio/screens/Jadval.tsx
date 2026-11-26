"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { addDays, MONTHS, WD_SHORT, weekdayIdx } from "@/lib/dates";
import { eventTone } from "@/lib/studio/calendar";
import { initials, kindLabel, shortName, span } from "@/lib/studio/team";
import { Button } from "../Button";
import { dataChanged, useDataVersion } from "../data";
import { StudioIcon, type StudioIconName } from "../icons";
import { Illustration, StateBlock } from "../StateBlock";
import { useStudio } from "../PanelProvider";
import { SettingsLink } from "../Shell";
import { StaffForm, StaffPanel, TaskForm, TaskPanel } from "../TeamForms";
import { Toast, type ToastMsg } from "../Toast";

export type Staff = { id: string; name: string; role: string; phone: string | null; telegram: string | null };
export type Task = { id: string; orderId: string | null; kind: string; day: string; startsAt: string; endsAt: string | null; place: string | null; note: string | null; eventType: string | null; client: string | null; staffIds: string[] };
export type WeekOrder = { id: string; client: string; venue: string | null; eventType: string; date: string };
export type Week = { today: string; week: string; days: string[]; staff: Staff[]; orders: WeekOrder[]; tasks: Task[]; hasAny: boolean };
export type Layer =
  | { kind: "staff-new" }
  | { kind: "staff-edit"; staff: Staff }
  | { kind: "staff"; id: string }
  | { kind: "task-new"; staffIds?: string[] }
  | { kind: "task-edit"; id: string }
  | { kind: "task"; id: string };

const mon = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
export const dShort = (iso: string) => `${Number(iso.slice(8, 10))}-${mon(iso)}`;
export const weekLabel = (a: string) => {
  const b = addDays(a, 6);
  return a.slice(5, 7) === b.slice(5, 7) ? `${Number(a.slice(8, 10))}–${Number(b.slice(8, 10))}-${mon(a)}` : `${dShort(a)} – ${dShort(b)}`;
};
export const timeRange = (t: { startsAt: string; endsAt: string | null }) => (t.endsAt ? `${t.startsAt}–${t.endsAt}` : t.startsAt);
const tone = (t: { eventType: string | null }) => (t.eventType ? eventTone(t.eventType) : "other");

/* Figma 09 · Jamoa jadvali (S8, 487:8916) — owner and manager */
export function JadvalScreen() {
  const ctx = useStudio();
  const version = useDataVersion();
  const [week, setWeek] = useState<string | null>(null);
  const [data, setData] = useState<Week | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [layer, setLayer] = useState<Layer | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    if (!ctx) return;
    let alive = true;
    api<Week>(`/api/panel/schedule${week ? `?week=${week}` : ""}`)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [ctx, week, version, nonce]);

  const shown = data?.week ?? week;
  const done = (text: string, next: Layer | null = null) => {
    setLayer(next);
    dataChanged();
    setToast({ id: Date.now(), text });
  };

  return (
    <>
      <header className="ds-list-head" data-wide>
        <h1 className="ds-h1">Jamoa jadvali</h1>
        <div className="ds-cal-actions" style={{ gap: "var(--ds-space-16)" }}>
          {data?.hasAny && (
            <div className="ds-xp-period">
              <button className="ds-iconbtn" data-style="secondary" onClick={() => shown && setWeek(addDays(shown, -7))} aria-label="Oldingi hafta">
                <StudioIcon name="chevron-left" />
              </button>
              <span className="ds-body-medium" aria-live="polite">
                {shown ? weekLabel(shown) : " "}
              </span>
              <button className="ds-iconbtn" data-style="secondary" onClick={() => shown && setWeek(addDays(shown, 7))} aria-label="Keyingi hafta">
                <StudioIcon name="chevron-right" />
              </button>
            </div>
          )}
          <span className="ds-desktop-only">
            <Button icon={<StudioIcon name="plus" />} onClick={() => setLayer({ kind: "task-new" })} disabled={!ctx || Boolean(error && !data)}>
              Vazifa qoʻshish
            </Button>
          </span>
          <SettingsLink />
        </div>
      </header>

      {error && !data ? (
        <StateBlock alert art="xato" title="Maʼlumot yuklanmadi" action={{ label: "Qayta urinish", icon: <StudioIcon name="refresh-cw" />, onClick: () => setNonce((n) => n + 1) }}>
          Internet aloqasini tekshiring. Jadval serverda saqlangan.
        </StateBlock>
      ) : !data ? (
        <div className="ds-stack" style={{ gap: "var(--ds-space-24)" }} aria-busy>
          <span className="ds-skeleton" style={{ height: 248, borderRadius: "var(--ds-radius-xl)" }} />
          <span className="ds-skeleton" style={{ height: 720, borderRadius: "var(--ds-radius-xl)" }} />
        </div>
      ) : !data.hasAny ? (
        <Empty onNew={() => setLayer({ kind: "staff-new" })} />
      ) : (
        <>
          <Hero data={data} />
          <Grid data={data} open={setLayer} />
        </>
      )}

      <button className="ds-fab" aria-label="Vazifa qoʻshish" onClick={() => setLayer({ kind: "task-new" })}>
        <StudioIcon name="plus" size={24} />
      </button>

      {(layer?.kind === "staff-new" || layer?.kind === "staff-edit") && (
        <StaffForm staff={layer.kind === "staff-edit" ? layer.staff : undefined} onClose={() => setLayer(null)} onSaved={(s, created) => done(created ? "Xodim qoʻshildi" : "Saqlandi", created ? null : { kind: "staff", id: s.id })} />
      )}
      {layer?.kind === "staff" && data && <StaffPanel id={layer.id} week={data} onClose={() => setLayer(null)} open={setLayer} onRemoved={() => done("Xodim olib tashlandi")} />}
      {(layer?.kind === "task-new" || layer?.kind === "task-edit") && (
        <TaskForm
          taskId={layer.kind === "task-edit" ? layer.id : undefined}
          presetStaff={layer.kind === "task-new" ? layer.staffIds : undefined}
          staff={data?.staff ?? []}
          onClose={() => setLayer(null)}
          onSaved={(id, n, created) => done(n ? `Biriktirildi · ${n} kishi` : created ? "Vazifa qoʻshildi" : "Saqlandi", { kind: "task", id })}
        />
      )}
      {layer?.kind === "task" && <TaskPanel id={layer.id} onClose={() => setLayer(null)} open={setLayer} toast={setToast} onRemoved={() => done("Vazifa oʻchirildi")} />}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

/* ── Hero · Asosiy koʻrsatkichlar ── */
function Hero({ data }: { data: Week }) {
  const inWeek = data.tasks.filter((t) => t.day >= data.week && t.day <= addDays(data.week, 6));
  const perDay = data.days.map((d) => inWeek.filter((t) => t.day === d).length);
  const maxDay = Math.max(1, ...perDay);
  const working = data.staff.filter((s) => data.tasks.some((t) => t.day === data.today && t.staffIds.includes(s.id)));
  const idle = data.staff.filter((s) => !working.includes(s));
  const open = inWeek.filter((t) => t.staffIds.length === 0);
  const openDays = [...new Set(open.map((t) => t.day))].sort();
  const load = data.staff.map((s) => ({ s, n: inWeek.filter((t) => t.staffIds.includes(s.id)).length }));
  const top = load.reduce<(typeof load)[number] | null>((a, b) => (!a || b.n > a.n ? b : a), null);
  const avg = load.length ? load.reduce((x, l) => x + l.n, 0) / load.length : 0;
  const maxLoad = Math.max(1, ...load.map((l) => l.n));
  const isNow = data.today >= data.week && data.today <= addDays(data.week, 6);
  return (
    <section className="ds-kpihero" aria-labelledby="jj-hero-h">
      <div className="ds-hero-head">
        <h2 id="jj-hero-h">Asosiy koʻrsatkichlar</h2>
        <span className="ds-hero-pill">Hafta · {weekLabel(data.week)}</span>
      </div>
      <div className="ds-hero-tiles">
        <Tile icon="calendar" title="Bu hafta" value={data.orders.length} unit={`tadbir · ${inWeek.length} vazifa`} empty={inWeek.length === 0} hint="Bu hafta vazifa yoʻq">
          <span className="ds-jj-days" aria-hidden>
            {perDay.map((n, i) => (
              <span key={data.days[i]} data-today={data.days[i] === data.today || undefined}>
                <i style={{ height: `${Math.max(4, (n / maxDay) * 18)}px` }} />
                <b>{WD_SHORT[i]}</b>
              </span>
            ))}
          </span>
        </Tile>
        <Tile icon="user-check" title={isNow ? "Bugun ishda" : "Jamoa"} value={working.length} unit={`/ ${data.staff.length} kishi`} empty={data.staff.length === 0} hint="Xodim qoʻshing">
          <span className="ds-xp-split" aria-hidden>
            {data.staff.map((s) => (
              <i key={s.id} data-k={working.includes(s) ? "profit" : "cost"} style={{ flexGrow: 1 }} />
            ))}
          </span>
          <span className="ds-legend-dots">
            <span data-k="xp-profit">{working.length} ishda</span>
            <span data-k="later">{idle.length ? `Boʻsh: ${idle.slice(0, 3).map((s) => s.name.split(" ")[0]).join(", ")}${idle.length > 3 ? "…" : ""}` : "Hamma band"}</span>
          </span>
        </Tile>
        <Tile icon="alert-triangle" title="Biriktirilmagan" value={open.length} unit="vazifa" tone={open.length ? "due" : undefined} empty={inWeek.length === 0} hint="Vazifalar yoʻq">
          <span className="ds-xp-split" aria-hidden>
            {inWeek.length - open.length > 0 && <i data-k="profit" style={{ flexGrow: inWeek.length - open.length }} />}
            {open.length > 0 && <i data-jj="open" style={{ flexGrow: open.length }} />}
          </span>
          <span className="ds-legend-dots">
            <span data-k="xp-profit">{inWeek.length - open.length} biriktirilgan</span>
            {open.length > 0 && <span data-jj="open">{open.length} yoʻq</span>}
            {open.length > 0 && (
              <span data-k="none">
                {openDays.length > 1 ? `${Number(openDays[0].slice(8, 10))}–${dShort(openDays[openDays.length - 1])}` : dShort(openDays[0])} · {[...new Set(open.map((t) => kindLabel(t.kind).toLowerCase()))].join(", ")}
              </span>
            )}
          </span>
        </Tile>
        <Tile icon="briefcase" title="Eng band" value={top?.n ?? 0} unit={top && top.n ? `vazifa · ${shortName(top.s.name)}` : "vazifa"} empty={!top || top.n === 0} hint="Hali hech kim band emas">
          <span className="ds-jj-load" aria-hidden>
            {load.map((l) => (
              <i key={l.s.id} data-top={l === top || undefined} style={{ height: `${Math.max(6, (l.n / maxLoad) * 24)}px` }} />
            ))}
          </span>
          <span className="ds-legend-dots">
            {top && <span data-jj="open">{`${shortName(top.s.name)} · ${top.n}`}</span>}
            <span data-k="later">Jamoa oʻrtachasi {String(Math.round(avg * 10) / 10).replace(".", ",")}</span>
          </span>
        </Tile>
      </div>
    </section>
  );
}

function Tile({ icon, title, value, unit, tone: t, empty, hint, children }: { icon: StudioIconName; title: string; value: number; unit: string; tone?: "due"; empty: boolean; hint: string; children: ReactNode }) {
  return (
    <article className="ds-ktile ds-xp-tile" data-empty={empty || undefined}>
      <div className="ds-tile-main">
        <h3>
          <StudioIcon name={icon} variant="Filled" size={16} />
          <span>{title}</span>
        </h3>
        <p className="ds-tile-val" data-tone={t}>
          <b>{value}</b>
          <span>{unit}</span>
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

/* ── Hafta grid: XODIM column + 7 days; Tadbirlar row, one row per person, Biriktirilmagan row ── */
function Grid({ data, open }: { data: Week; open(l: Layer): void }) {
  const week = data.tasks.filter((t) => data.days.includes(t.day));
  const unassigned = week.filter((t) => t.staffIds.length === 0);
  const card = (t: Task) => (
    <button key={t.id} type="button" className="ds-jj-task" data-tone={tone(t)} onClick={() => open({ kind: "task", id: t.id })} aria-label={`${kindLabel(t.kind)}, ${dShort(t.day)} ${timeRange(t)}${t.place ? `, ${t.place}` : ""}`}>
      <b>{kindLabel(t.kind)}</b>
      <span>
        {t.startsAt}
        {t.place ? ` · ${t.place}` : ""}
      </span>
    </button>
  );
  return (
    <section className="ds-dcard ds-jj-grid" aria-labelledby="jj-grid-h">
      <div className="ds-dcard-head">
        <h2 id="jj-grid-h">Hafta · {weekLabel(data.week)}</h2>
        <span className="ds-jj-legend" aria-hidden>
          <span data-tone="wedding">Toʻy</span>
          <span data-tone="engagement">Nikoh · fotiha</span>
          <span data-tone="birthday">Tugʻilgan kun</span>
          <span data-tone="open">Biriktirilmagan</span>
        </span>
      </div>
      <div className="ds-jj-scroll">
        <div className="ds-jj-table" role="table" aria-label={`Jamoa jadvali, ${weekLabel(data.week)}`}>
          <div className="ds-jj-row ds-jj-headrow" role="row">
            <span role="columnheader" className="ds-caps ds-tertiary">
              Xodim
            </span>
            {data.days.map((d) => (
              <span key={d} role="columnheader" className="ds-jj-day" data-today={d === data.today || undefined}>
                {WD_SHORT[weekdayIdx(d)].toUpperCase()} <b>{Number(d.slice(8, 10))}</b>
                {d === data.today && " · Bugun"}
              </span>
            ))}
          </div>
          <div className="ds-jj-row" role="row">
            <span role="rowheader" className="ds-caps ds-tertiary ds-jj-events-h">
              Tadbirlar
            </span>
            {data.days.map((d) => (
              <span key={d} role="cell" className="ds-jj-cell" data-today={d === data.today || undefined}>
                {data.orders
                  .filter((o) => o.date === d)
                  .map((o) => (
                    <span key={o.id} className="ds-jj-event" data-tone={eventTone(o.eventType)}>
                      {shortName(o.client)}
                    </span>
                  ))}
              </span>
            ))}
          </div>
          {data.staff.map((s) => (
            <div key={s.id} className="ds-jj-row" role="row">
              <span role="rowheader">
                <button type="button" className="ds-jj-person" onClick={() => open({ kind: "staff", id: s.id })}>
                  <span className="ds-jj-avatar" aria-hidden>
                    {initials(s.name)}
                  </span>
                  <span>
                    <span>{s.name}</span>
                    <span>{s.role}</span>
                  </span>
                </button>
              </span>
              {data.days.map((d) => (
                <span key={d} role="cell" className="ds-jj-cell" data-today={d === data.today || undefined}>
                  {week.filter((t) => t.day === d && t.staffIds.includes(s.id)).map(card)}
                </span>
              ))}
            </div>
          ))}
          {unassigned.length > 0 && (
            <div className="ds-jj-row" role="row">
              <span role="rowheader" className="ds-jj-person" data-static>
                <span className="ds-jj-avatar" data-open aria-hidden>
                  <StudioIcon name="user-plus" variant="Filled" size={16} />
                </span>
                <span>
                  <span>Biriktirilmagan</span>
                  <span data-warn>Odam qoʻshish kerak</span>
                </span>
              </span>
              {data.days.map((d) => (
                <span key={d} role="cell" className="ds-jj-cell" data-today={d === data.today || undefined}>
                  {unassigned
                    .filter((t) => t.day === d)
                    .map((t) => (
                      <button key={t.id} type="button" className="ds-jj-task" data-tone="open" onClick={() => open({ kind: "task-edit", id: t.id })} aria-label={`${kindLabel(t.kind)} ${t.startsAt}: odam biriktirish`}>
                        <b>+ {kindLabel(t.kind)}</b>
                        <span>
                          {t.startsAt}
                          {t.place ? ` · ${t.place}` : ""}
                        </span>
                      </button>
                    ))}
                </span>
              ))}
            </div>
          )}
          <div className="ds-jj-row ds-jj-addrow" role="row">
            <span role="rowheader">
              <button type="button" className="ds-btn" data-style="ghost" onClick={() => open({ kind: "staff-new" })}>
                <StudioIcon name="plus" />
                <span>Xodim qoʻshish</span>
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* hours a person works in the shown week (overnight jobs counted to their end) */
export const weekHours = (tasks: Task[]) => Math.round(tasks.reduce((s, t) => s + (span(t)[1] - span(t)[0]), 0) / 60);

/* ── S8 · Jamoa jadvali · boʻsh (496:10038) ── */
function Empty({ onNew }: { onNew(): void }) {
  const steps = [
    { title: "Xodim qoʻshing", text: "Ismi, roli va telefoni" },
    { title: "Tadbirga biriktiring", text: "Montaj, demontaj, yetkazish" },
    { title: "Jadvalda koʻring", text: "Kim qachon qayerda — bir qarashda" },
  ];
  return (
    <section className="ds-xp-empty" aria-labelledby="jj-empty-h">
      <Illustration art="jamoa" className="ds-xp-empty-art" />
      <div className="ds-xp-empty-text">
        <h2 id="jj-empty-h">Jamoangizni qoʻshing</h2>
        <p className="ds-body-sm ds-secondary">Floristlar, montajchilar, haydovchilar. Ilovaga kirishlari shart emas — vazifalarni siz shu yerda taqsimlaysiz.</p>
      </div>
      <div className="ds-cal-actions">
        <Link href="/panel/sozlamalar" className="ds-btn" data-style="secondary">
          <span>Menejer taklif qilish</span>
        </Link>
        <Button onClick={onNew}>Xodim qoʻshish</Button>
      </div>
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
