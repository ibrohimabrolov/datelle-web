"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { isISODate, MONTHS, WD_FULL, weekdayIdx } from "@/lib/dates";
import { eventLabel } from "@/lib/studio/calendar";
import { groupThousands, isOverdue, ORDER_VIEWS, weekGroup, type OrderView } from "@/lib/studio/orders";
import { Button } from "../Button";
import { fetchList, listCache, useDataVersion, type OrderList, type OrderRow } from "../data";
import { StudioIcon } from "../icons";
import { StateBlock } from "../StateBlock";
import { OrderCard } from "../OrderCard";
import { OrderDetail } from "../OrderDetail";
import { OrderForm, type Prefill } from "../OrderForm";
import { useStudio } from "../PanelProvider";
import { Menu, Modal } from "../Modal";
import { reminderText, smsHref } from "@/lib/studio/clientDocs";
import { Toast, type ToastMsg } from "../Toast";
import { SettingsLink } from "../Shell";

const BASE = "/panel/buyurtmalar";
const VIEW_LABEL: Record<OrderView, string> = { upcoming: "Kelgusi", debt: "Qoldiq bor", past: "Oʻtgan", cancelled: "Bekor qilingan" };
const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
const fmtPhone = (p: string) => p.replace(/^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ymLabel = (ym: string) => `${cap1(MONTHS[Number(ym.slice(5, 7)) - 1])} ${ym.slice(0, 4)}`;
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
const PER = [10, 20, 50] as const;

/* Figma S4 · Buyurtmalar — desktop DataTable, mobile grouped cards. URL holds the state:
   ?view&q&page&sort&dir, /panel/buyurtmalar/<id> opens the order, /panel/buyurtmalar/yangi?sana opens the form. */
export function OrdersScreen() {
  const ctx = useStudio();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const { id: routeId } = useParams<{ id?: string }>();
  const version = useDataVersion();
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const view = (ORDER_VIEWS as readonly string[]).includes(params.get("view") ?? "") ? (params.get("view") as OrderView) : "upcoming";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = (["date", "total", "balance"] as const).find((s) => s === params.get("sort")) ?? "date";
  const dir = params.get("dir") === "asc" || params.get("dir") === "desc" ? (params.get("dir") as "asc" | "desc") : null;
  const per = PER.find((n) => String(n) === params.get("per")) ?? 10;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get("oy") ?? "") ? params.get("oy")! : null;
  const isNew = path.endsWith("/yangi");
  const newDate = params.get("sana");
  const draftId = isNew ? params.get("qoralama") : null;
  const draft = useDraft(draftId, () => setToast({ id: Date.now(), text: "Qoralama topilmadi yoki allaqachon saqlangan" }));
  const openId = !isNew && routeId ? routeId : null;

  const qs = useMemo(() => {
    const s = new URLSearchParams({ view, page: String(page), sort, per: String(per) });
    if (q) s.set("q", q);
    if (dir) s.set("dir", dir);
    if (month) s.set("month", month);
    return s.toString();
  }, [view, page, sort, dir, q, per, month]);

  // list: stale-while-revalidate per query; refetch on any data change
  const studioId = ctx?.studio.id;
  const [state, setState] = useState<{ for: string | null; data: OrderList | null; error: string | null }>({ for: null, data: null, error: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!studioId) return;
    let alive = true;
    const had = listCache.has(`${studioId}:${qs}`);
    fetchList(studioId, qs)
      .then((d) => alive && setState({ for: qs, data: d, error: null }))
      .catch((e) => alive && !had && setState({ for: qs, data: null, error: e instanceof ApiError ? e.message : "Yuklab boʻlmadi" }));
    return () => {
      alive = false;
    };
  }, [studioId, qs, version, nonce]);
  const cur = state.for === qs ? state : { data: studioId ? (listCache.get(`${studioId}:${qs}`) ?? null) : null, error: null };
  const data = cur.data;

  // bulk selection (Figma S4 · tanlangan): rows of the current list; any list change clears it
  const [picked, setPicked] = useState<{ key: string; rows: Map<string, OrderRow> }>({ key: "", rows: new Map() });
  const sel = picked.key === qs ? picked.rows : new Map<string, OrderRow>();
  const toggle = (o: OrderRow) => {
    const next = new Map(sel);
    if (next.has(o.id)) next.delete(o.id);
    else next.set(o.id, o);
    setPicked({ key: qs, rows: next });
  };
  const pageRows = data?.items ?? [];
  const allOn = pageRows.length > 0 && pageRows.every((o) => sel.has(o.id));
  const someOn = !allOn && pageRows.some((o) => sel.has(o.id));
  const toggleAll = () => setPicked({ key: qs, rows: allOn ? new Map() : new Map(pageRows.map((o) => [o.id, o])) });
  const clearSel = () => setPicked({ key: "", rows: new Map() });
  const selDue = [...sel.values()].reduce((a, o) => a + Math.max(0, o.balance), 0);
  const [remind, setRemind] = useState<OrderRow[] | null>(null);

  // mobile "Yana yuklash": accumulate pages client-side
  const [extra, setExtra] = useState<{ key: string; items: OrderRow[]; page: number }>({ key: "", items: [], page: 1 });
  const listKey = `${view}|${q}|${sort}|${dir}|${month}|${per}`;
  const mobileItems = useMemo(() => (extra.key === listKey ? [...(data?.items ?? []), ...extra.items] : (data?.items ?? [])), [extra, listKey, data]);
  const moreLeft = data ? data.total - (page - 1) * data.pageSize - mobileItems.length : 0;

  const nav = useCallback(
    (next: Record<string, string | null>, to = BASE) => {
      const s = new URLSearchParams(params.toString());
      s.delete("sana");
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "") s.delete(k);
        else s.set(k, v);
      }
      const str = s.toString();
      router.push(`${to}${str ? `?${str}` : ""}`, { scroll: false });
    },
    [params, router],
  );
  const listParams = () => {
    const s = new URLSearchParams(params.toString());
    s.delete("sana");
    return s.toString();
  };
  const open = (id: string) => router.push(`${BASE}/${id}${listParams() ? `?${listParams()}` : ""}`, { scroll: false });
  const closeLayer = () => router.push(`${BASE}${listParams() ? `?${listParams()}` : ""}`, { scroll: false });

  // search: debounce into the URL
  const [term, setTerm] = useState(q);
  const [searchOpen, setSearchOpen] = useState(Boolean(q));
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onSearch = (v: string) => {
    setTerm(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => nav({ q: v.trim() || null, page: null }, path.startsWith(`${BASE}/`) ? BASE : path), 250);
  };

  const clearSearch = () => {
    clearTimeout(debounce.current);
    setTerm("");
    nav({ q: null, page: null }, path.startsWith(`${BASE}/`) ? BASE : path);
  };

  const sortBy = (col: "date" | "total" | "balance") => {
    const curDir = dir ?? (col === "date" ? (view === "past" || view === "cancelled" ? "desc" : "asc") : "desc");
    nav({ sort: col, dir: sort === col ? (curDir === "asc" ? "desc" : "asc") : null, page: null });
  };
  const ariaSort = (col: string) => (sort === col ? ((dir ?? (col === "date" && (view === "upcoming" || view === "debt") ? "asc" : "desc")) === "asc" ? "ascending" : "descending") : undefined);

  const groups = useMemo(() => {
    if (!data) return [];
    const out: { title: string; items: OrderRow[] }[] = [];
    for (const o of mobileItems) {
      const t = view === "upcoming" || view === "debt" ? weekGroup(o.date, data.today, monthName) : monthName(o.date);
      const last = out.at(-1);
      if (last?.title === t) last.items.push(o);
      else out.push({ title: t, items: [o] });
    }
    return out;
  }, [data, mobileItems, view]);

  const first = data && data.total ? (page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.total, page * data.pageSize) : 0;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <header className="ds-list-head" data-wide>
        <div>
          <span className="ds-caps ds-tertiary ds-mobile-only" aria-live="polite">
            {data ? `${data.counts.active} ta faol · ${data.counts.debt} ta qoldiq` : " "}
          </span>
          <h1 className="ds-h1">Buyurtmalar</h1>
        </div>
        <div className="ds-cal-actions">
          <div className="ds-search ds-desktop-only" role="search">
            <StudioIcon name="search" />
            <input type="search" aria-label="Ism yoki telefon boʻyicha qidirish" placeholder="Ism yoki telefon" value={term} onChange={(e) => onSearch(e.target.value)} />
            {term && (
              <button type="button" className="ds-search-clear" aria-label="Qidiruvni tozalash" onClick={clearSearch}>
                <StudioIcon name="cross" size={16} />
              </button>
            )}
          </div>
          <SettingsLink />
          <button className="ds-iconbtn ds-mobile-only" data-style="secondary" aria-label="Qidirish" aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
            <StudioIcon name="search" />
          </button>
          <button className="ds-btn ds-desktop-only" data-style="primary" disabled={Boolean(cur.error && !data)} onClick={() => router.push(`${BASE}/yangi${listParams() ? `?${listParams()}` : ""}`)}>
            <StudioIcon name="plus" />
            <span>Buyurtma qoʻshish</span>
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="ds-search ds-mobile-only" role="search">
          <StudioIcon name="search" />
          <input type="search" autoFocus aria-label="Ism yoki telefon boʻyicha qidirish" placeholder="Ism yoki telefon" value={term} onChange={(e) => onSearch(e.target.value)} />
          {term && (
            <button type="button" className="ds-search-clear" aria-label="Qidiruvni tozalash" onClick={clearSearch}>
              <StudioIcon name="cross" size={16} />
            </button>
          )}
        </div>
      )}

      {sel.size > 0 ? (
        /* Figma Bulk bar (128:15489): brand/subtle pill, Body/Strong summary · Eslatma yuborish · Eksport · ✕ */
        <div className="ds-bulkbar ds-desktop-only" role="region" aria-label="Tanlangan buyurtmalar" onKeyDown={(e) => e.key === "Escape" && clearSel()}>
          <p aria-live="polite">
            {sel.size} ta tanlandi{selDue > 0 ? ` · qoldiq ${groupThousands(selDue)} soʻm` : ""}
          </p>
          <Button variant="secondary" icon={<StudioIcon name="bell" variant="Filled" />} disabled={selDue <= 0} onClick={() => setRemind([...sel.values()])}>
            Eslatma yuborish
          </Button>
          <Button variant="secondary" onClick={() => exportCsv([...sel.values()], ctx?.studio.name ?? "Floreal")}>
            Eksport
          </Button>
          <button className="ds-iconbtn" data-style="ghost" aria-label="Tanlovni bekor qilish" onClick={clearSel}>
            <StudioIcon name="cross" />
          </button>
        </div>
      ) : (
        <div className="ds-list-tools">
          {/* Tabs: the count sits on the active tab only (Figma "Kelgusi · 24"), mobile too */}
          <div className="ds-segment" role="tablist" aria-label="Buyurtmalar boʻlimi">
            {ORDER_VIEWS.map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => nav({ view: v === "upcoming" ? null : v, page: null, sort: null, dir: null })}>
                {VIEW_LABEL[v]}
                {data && view === v && (
                  <span className="ds-count">
                    <span className="ds-desktop-only"> · </span>
                    <span className="ds-mobile-only"> </span>
                    {data.counts[v]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ds-desktop-only">
            <Menu
              label="Oy boʻyicha"
              trigger={month ? ymLabel(month) : "Barcha oylar"}
              triggerIcon={<StudioIcon name="calendar" variant="Filled" />}
              triggerStyle="secondary"
              items={[
                { label: "Barcha oylar", checked: !month, onSelect: () => nav({ oy: null, page: null }) },
                ...[...(data?.months ?? [])]
                  .sort((a, b) => (view === "past" || view === "cancelled" ? b.ym.localeCompare(a.ym) : a.ym.localeCompare(b.ym)))
                  .concat(month && data && !data.months.some((m) => m.ym === month) ? [{ ym: month, count: 0 }] : [])
                  .map((m) => ({ label: ymLabel(m.ym), meta: String(m.count), checked: m.ym === month, onSelect: () => nav({ oy: m.ym, page: null }) })),
              ]}
            />
          </div>
        </div>
      )}

      {cur.error && !data ? (
        <StateBlock alert art="xato" title="Buyurtmalar yuklanmadi" action={{ label: "Qayta urinish", icon: <StudioIcon name="refresh-cw" />, onClick: () => setNonce((n) => n + 1) }}>
          Internet aloqasini tekshiring. Maʼlumotlaringiz serverda saqlangan.
        </StateBlock>
      ) : data && data.items.length === 0 ? (
        <Empty
          view={view}
          q={q}
          onNew={() => router.push(`${BASE}/yangi`)}
          onClear={clearSearch}
        />
      ) : (
        <>
          {/* desktop table — Figma DataTableHead / DataTableRow / TablePagination (S4 · Buyurtmalar 10:368) */}
          <div className="ds-table-wrap ds-desktop-only" aria-busy={!data || undefined}>
            <table className="ds-table">
              <caption className="ds-sr-only">{VIEW_LABEL[view]} buyurtmalar</caption>
              <thead>
                <tr>
                  <th scope="col" className="c-check">
                    <Check checked={allOn} mixed={someOn} label="Sahifadagi hammasini tanlash" onChange={toggleAll} disabled={!pageRows.length} />
                  </th>
                  <th scope="col" className="c-date" aria-sort={ariaSort("date")}>
                    <SortBtn label="Sana" active={sort === "date"} asc={ariaSort("date") === "ascending"} onClick={() => sortBy("date")} />
                  </th>
                  <th scope="col" className="c-client">Mijoz</th>
                  <th scope="col" className="c-place">Joy va tadbir</th>
                  <th scope="col" className="c-sum" data-num aria-sort={ariaSort("total")}>
                    <SortBtn label="Summa" active={sort === "total"} asc={ariaSort("total") === "ascending"} onClick={() => sortBy("total")} />
                  </th>
                  <th scope="col" className="c-due" data-num aria-sort={ariaSort("balance")}>
                    <SortBtn label="Qoldiq" active={sort === "balance"} asc={ariaSort("balance") === "ascending"} onClick={() => sortBy("balance")} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {data
                  ? data.items.map((o) => (
                      <tr
                        key={o.id}
                        tabIndex={0}
                        aria-selected={o.id === openId}
                        data-checked={sel.has(o.id) || undefined}
                        onClick={() => open(o.id)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            open(o.id);
                          }
                        }}
                      >
                        <td className="c-check" onClick={(e) => e.stopPropagation()}>
                          <Check checked={sel.has(o.id)} label={`${o.client} — tanlash`} onChange={() => toggle(o)} />
                        </td>
                        <td className="c-date">
                          <span className="ds-cell-main">{dayMonth(o.date)}</span>
                          <span className="ds-cell-sub">{WD_FULL[weekdayIdx(o.date)]}</span>
                        </td>
                        <td className="c-client">
                          <span className="ds-cell-person">
                            <span className="ds-avatar" aria-hidden>
                              {initials(o.client)}
                            </span>
                            <span>
                              <span className="ds-cell-main" title={o.client}>
                                {o.client}
                              </span>
                              <span className="ds-cell-sub">{fmtPhone(o.phone)}</span>
                            </span>
                          </span>
                        </td>
                        <td className="c-place">
                          <span className="ds-cell-main ds-regular" title={o.venue ?? undefined}>
                            {o.venue || eventLabel(o.eventType)}
                          </span>
                          {o.venue && <span className="ds-cell-sub">{eventLabel(o.eventType)}</span>}
                        </td>
                        <td className="c-sum" data-num>
                          {groupThousands(o.total)}
                        </td>
                        <td className="c-due" data-num data-paid={o.balance <= 0 || undefined} data-overdue={isOverdue(o.date, o.balance, data.today) || undefined}>
                          {o.balance > 0 ? groupThousands(o.balance) : o.balance < 0 ? `+${groupThousands(-o.balance)}` : "Toʻlangan"}
                        </td>
                      </tr>
                    ))
                  : Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} aria-hidden>
                        <td colSpan={6}>
                          <span className="ds-skeleton" style={{ display: "block", height: 20 }} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {data && data.total > 0 && (
              <div className="ds-table-foot">
                <label className="ds-pager-per">
                  <span>Sahifada</span>
                  <span className="ds-select">
                    <select value={per} onChange={(e) => nav({ per: e.target.value === "10" ? null : e.target.value, page: null })}>
                      {PER.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <StudioIcon name="chevron-down" size={16} />
                  </span>
                </label>
                <span className="ds-pager-range" aria-live="polite">
                  {first}–{last} / {data.total}
                </span>
                <div className="ds-pager-nav">
                  <button className="ds-iconbtn" data-style="ghost" aria-label="Birinchi sahifa" disabled={page <= 1} onClick={() => nav({ page: null })}>
                    <StudioIcon name="chevrons-left" />
                  </button>
                  <button className="ds-iconbtn" data-style="ghost" aria-label="Oldingi sahifa" disabled={page <= 1} onClick={() => nav({ page: page - 1 > 1 ? String(page - 1) : null })}>
                    <StudioIcon name="chevron-left" />
                  </button>
                  <button className="ds-iconbtn" data-style="ghost" aria-label="Keyingi sahifa" disabled={last >= data.total} onClick={() => nav({ page: String(page + 1) })}>
                    <StudioIcon name="chevron-right" />
                  </button>
                  <button className="ds-iconbtn" data-style="ghost" aria-label="Oxirgi sahifa" disabled={last >= data.total} onClick={() => nav({ page: String(lastPage) })}>
                    <StudioIcon name="chevrons-right" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* mobile grouped cards */}
          <div className="ds-groups ds-mobile-only" aria-busy={!data || undefined}>
            {data
              ? groups.map((g) => (
                  <section className="ds-group" key={g.title} aria-label={g.title}>
                    <h2 className="ds-caps ds-tertiary">
                      {g.title} · {g.items.length}
                    </h2>
                    {g.items.map((o) => (
                      <OrderCard key={o.id} order={o} today={data.today} onOpen={() => open(o.id)} />
                    ))}
                  </section>
                ))
              : Array.from({ length: 4 }, (_, i) => <span key={i} className="ds-skeleton" style={{ height: 80, borderRadius: "var(--ds-radius-xl)" }} />)}
            {data && moreLeft > 0 && (
              <Button
                variant="secondary"
                block
                onClick={async () => {
                  const nextPage = (extra.key === listKey ? extra.page : page) + 1;
                  const s = new URLSearchParams(qs);
                  s.set("page", String(nextPage));
                  const more = await fetchList(studioId!, s.toString());
                  setExtra((p) => ({ key: listKey, page: nextPage, items: [...(p.key === listKey ? p.items : []), ...more.items] }));
                }}
              >
                Yana {Math.min(moreLeft, data.pageSize)} ta
              </Button>
            )}
          </div>
        </>
      )}

      <button className="ds-fab" aria-label="Buyurtma qoʻshish" onClick={() => router.push(`${BASE}/yangi`)}>
        <StudioIcon name="plus" size={24} />
      </button>

      {isNew && ctx && draft.state !== "loading" && (
        <OrderForm
          date={newDate && isISODate(newDate) ? newDate : undefined}
          prefill={draft.state === "ready" ? draft.prefill : undefined}
          onClose={closeLayer}
          onSaved={(r) => {
            router.replace(`${BASE}/${r.order.id}`, { scroll: false });
            setToast({ id: Date.now(), text: r.warnings.includes("capacity_exceeded") ? "Saqlandi · bu kunda sigʻim toʻlgan" : r.warnings.includes("day_blocked") ? "Saqlandi · bu kun yopiq edi" : "Buyurtma saqlandi" });
          }}
        />
      )}
      {openId && ctx && <OrderDetail key={openId} id={openId} onClose={closeLayer} toast={setToast} />}

      {remind && <BulkRemind orders={remind} onClose={() => setRemind(null)} />}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

/* Figma Inputs/Selection · checkbox 22, r8, 1.5px border/control; checked = brand/solid + check 16 */
function Check({ checked, mixed, label, onChange, disabled }: { checked: boolean; mixed?: boolean; label: string; onChange(): void; disabled?: boolean }) {
  return (
    <label className="ds-checkbox">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        disabled={disabled}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(mixed);
        }}
        onChange={onChange}
      />
      <span aria-hidden>{mixed ? <StudioIcon name="minus" size={16} /> : <StudioIcon name="check" size={16} />}</span>
    </label>
  );
}

/* DataTableHead sortable column: chevron 16 — icon/muted idle, icon/default + text/primary active */
function SortBtn({ label, active, asc, onClick }: { label: string; active: boolean; asc: boolean; onClick(): void }) {
  return (
    <button type="button" data-active={active || undefined} onClick={onClick}>
      {label}
      <StudioIcon name="chevron-down" size={16} style={{ transform: active && !asc ? "rotate(180deg)" : undefined }} />
    </button>
  );
}

/* Eksport: selected rows → CSV (UTF-8 BOM so Excel opens Cyrillic/Uzbek letters correctly) */
function exportCsv(rows: OrderRow[], studio: string) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["Sana", "Mijoz", "Telefon", "Joy", "Tadbir", "Summa", "Toʻlangan", "Qoldiq", "Kod"];
  const body = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((o) => [o.date, o.client, o.phone, o.venue ?? "", eventLabel(o.eventType), o.total, o.paid, o.balance, o.code].map(esc).join(","));
  const blob = new Blob(["\ufeff" + [head.map(esc).join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${studio.replace(/[^\p{L}\p{N}]+/gu, "-")}-buyurtmalar.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* Eslatma yuborish (bulk): the text leaves from the studio's own phone, so this is a queue —
   one tap per client (Telegram copies the text and opens the chat; SMS opens the app), each tap is recorded. */
function BulkRemind({ orders, onClose }: { orders: OrderRow[]; onClose(): void }) {
  const ctx = useStudio();
  const studio = ctx?.studio.name ?? "";
  const due = orders.filter((o) => o.balance > 0).sort((a, b) => a.date.localeCompare(b.date));
  const skipped = orders.length - due.length;
  const [sent, setSent] = useState<Record<string, string>>({});
  const text = (o: OrderRow) => reminderText({ client: o.client, date: o.date, eventType: o.eventType, total: o.total, paid: o.paid, studio }, "uz");
  const record = (o: OrderRow, channel: "telegram" | "sms") => {
    setSent((s) => ({ ...s, [o.id]: channel === "telegram" ? "Telegram" : "SMS" }));
    void api(`/api/panel/orders/${o.id}/remind`, { body: { channel, lang: "uz" } }).catch(() => {});
  };
  const viaTelegram = (o: OrderRow) => {
    void navigator.clipboard?.writeText(text(o)).catch(() => {});
    const url = `https://t.me/${o.phone}`;
    const wa = window.Telegram?.WebApp;
    if (wa?.openTelegramLink) wa.openTelegramLink(url);
    else window.open(url, "_blank", "noopener");
    record(o, "telegram");
  };
  return (
    <Modal
      variant="dialog"
      size="lg"
      title="Eslatma yuborish"
      description={`${due.length} ta mijozga qoldiq haqida xabar. Telegram matnni nusxalab chatni ochadi — qoʻying va yuboring.${skipped ? ` ${skipped} tasi toʻlangan, oʻtkazib yuborildi.` : ""}`}
      onClose={onClose}
    >
      <ul className="ds-remind-queue">
        {due.map((o) => (
          <li key={o.id} data-done={sent[o.id] ? true : undefined}>
            <span className="ds-avatar" aria-hidden>
              {initials(o.client)}
            </span>
            <span className="ds-remind-who">
              <b>{o.client}</b>
              <span className="ds-body-sm ds-secondary">
                {dayMonth(o.date)} · qoldiq {groupThousands(o.balance)}
              </span>
            </span>
            {sent[o.id] ? (
              <span className="ds-label-strong ds-brand">
                <StudioIcon name="check" size={16} /> {sent[o.id]}
              </span>
            ) : (
              <span className="ds-remind-btns">
                <button className="ds-btn" data-style="secondary" data-size="m" onClick={() => viaTelegram(o)}>
                  <StudioIcon name="send" variant="Filled" />
                  <span>Telegram</span>
                </button>
                <a className="ds-btn" data-style="secondary" data-size="m" href={smsHref(o.phone, text(o))} onClick={() => record(o, "sms")}>
                  <span>SMS</span>
                </a>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="ds-modal-foot">
        <Button variant="secondary" block onClick={onClose}>
          {Object.keys(sent).length >= due.length ? "Tayyor" : "Yopish"}
        </Button>
      </div>
    </Modal>
  );
}

function Empty({ view, q, onNew, onClear }: { view: OrderView; q: string; onNew(): void; onClear(): void }) {
  if (q)
    return (
      <StateBlock art="topilmadi" title="Topilmadi" action={{ label: "Qidiruvni tozalash", onClick: onClear }}>
        Ism yoki telefonni tekshiring
      </StateBlock>
    );
  if (view === "debt")
    return (
      <StateBlock art="tolangan" title="Hamma toʻlangan">
        Qoldiq bor buyurtma yoʻq. Yangi qoldiq paydo boʻlsa, shu yerda chiqadi.
      </StateBlock>
    );
  if (view === "upcoming")
    return (
      <StateBlock art="kalendar" title="Kelgusi buyurtma yoʻq" action={{ label: "Buyurtma qoʻshish", icon: <StudioIcon name="plus" />, onClick: onNew, primary: true }}>
        Birinchi buyurtmani qoʻshing — u kalendarda ham koʻrinadi.
      </StateBlock>
    );
  return view === "past" ? (
    <StateBlock art="kalendar" title="Oʻtgan buyurtma yoʻq">
      Tadbir oʻtgach, buyurtma shu yerga tushadi.
    </StateBlock>
  ) : (
    <StateBlock art="topilmadi" title="Bekor qilingan yoʻq">
      Bekor qilingan buyurtmalar shu yerda saqlanadi.
    </StateBlock>
  );
}

/* Forward → buyurtma: ?qoralama=<id> from the bot's "Koʻrib saqlash" button.
   A missing/used draft opens the empty form — the studio can still paste the chat. */
type DraftState = { state: "none" | "loading" | "gone" } | { state: "ready"; prefill: Prefill };
function useDraft(id: string | null, onGone: () => void): DraftState {
  const [res, setRes] = useState<{ id: string; r: DraftState } | null>(null);
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<{ draft: { id: string; parsed: Prefill["parsed"] } }>(`/api/panel/drafts/${encodeURIComponent(id)}`)
      .then((r) => alive && setRes({ id, r: { state: "ready", prefill: { draftId: r.draft.id, parsed: r.draft.parsed } } }))
      .catch(() => {
        if (!alive) return;
        setRes({ id, r: { state: "gone" } });
        gone.current();
      });
    return () => {
      alive = false;
    };
  }, [id]);
  if (!id) return { state: "none" };
  return res?.id === id ? res.r : { state: "loading" };
}
