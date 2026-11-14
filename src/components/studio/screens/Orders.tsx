"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { isISODate, MONTHS, WD_SHORT, weekdayIdx } from "@/lib/dates";
import { eventLabel } from "@/lib/studio/calendar";
import { groupThousands, isOverdue, ORDER_VIEWS, weekGroup, type OrderView } from "@/lib/studio/orders";
import { Button } from "../Button";
import { fetchList, listCache, useDataVersion, type OrderList, type OrderRow } from "../data";
import { StudioIcon } from "../icons";
import { OrderCard } from "../OrderCard";
import { OrderDetail } from "../OrderDetail";
import { OrderForm } from "../OrderForm";
import { useStudio } from "../PanelProvider";
import { Toast, type ToastMsg } from "../Toast";
import { SettingsLink } from "../Shell";

const BASE = "/panel/buyurtmalar";
const VIEW_LABEL: Record<OrderView, string> = { upcoming: "Kelgusi", debt: "Qoldiq bor", past: "Oʻtgan", cancelled: "Bekor qilingan" };
const rowDate = (iso: string) => `${Number(iso.slice(8, 10))}-${MONTHS[Number(iso.slice(5, 7)) - 1]}, ${WD_SHORT[weekdayIdx(iso)].toLowerCase()}`;
const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
const fmtPhone = (p: string) => p.replace(/^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");

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
  const isNew = path.endsWith("/yangi");
  const newDate = params.get("sana");
  const openId = !isNew && routeId ? routeId : null;

  const qs = useMemo(() => {
    const s = new URLSearchParams({ view, page: String(page), sort });
    if (q) s.set("q", q);
    if (dir) s.set("dir", dir);
    return s.toString();
  }, [view, page, sort, dir, q]);

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

  // mobile "Yana yuklash": accumulate pages client-side
  const [extra, setExtra] = useState<{ key: string; items: OrderRow[]; page: number }>({ key: "", items: [], page: 1 });
  const listKey = `${view}|${q}|${sort}|${dir}`;
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

  return (
    <>
      <header className="ds-list-head">
        <div>
          <span className="ds-caps ds-tertiary" aria-live="polite">
            {data ? `${data.counts.active} ta faol · ${data.counts.debt} ta qoldiq` : " "}
          </span>
          <h1 className="ds-h1">Buyurtmalar</h1>
        </div>
        <div className="ds-cal-actions">
          <div className="ds-search ds-desktop-only" role="search">
            <StudioIcon name="search" />
            <input type="search" aria-label="Ism yoki telefon boʻyicha qidirish" placeholder="Ism yoki telefon" value={term} onChange={(e) => onSearch(e.target.value)} />
          </div>
          <SettingsLink />
          <button className="ds-iconbtn ds-mobile-only" data-style="secondary" aria-label="Qidirish" aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
            <StudioIcon name="search" />
          </button>
          <button className="ds-btn ds-desktop-only" data-style="primary" onClick={() => router.push(`${BASE}/yangi${listParams() ? `?${listParams()}` : ""}`)}>
            <StudioIcon name="plus" />
            <span>Buyurtma qoʻshish</span>
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="ds-search ds-mobile-only" role="search">
          <StudioIcon name="search" />
          <input type="search" autoFocus aria-label="Ism yoki telefon boʻyicha qidirish" placeholder="Ism yoki telefon" value={term} onChange={(e) => onSearch(e.target.value)} />
        </div>
      )}

      <div className="ds-list-tools">
        <div className="ds-segment" role="tablist" aria-label="Buyurtmalar boʻlimi">
          {ORDER_VIEWS.map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => nav({ view: v === "upcoming" ? null : v, page: null, sort: null, dir: null })}>
              {VIEW_LABEL[v]}
              {data && (v === "upcoming" || v === "debt") && data.counts[v] > 0 && (
                <span className="ds-count">
                  <span className="ds-desktop-only"> · </span>
                  <span className="ds-mobile-only"> </span>
                  {data.counts[v]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {cur.error && !data ? (
        <div className="ds-card ds-stack" role="alert">
          <p className="ds-body-strong">Buyurtmalarni yuklab boʻlmadi</p>
          <p className="ds-body ds-secondary">{cur.error}</p>
          <div>
            <Button variant="secondary" onClick={() => setNonce((n) => n + 1)}>
              Qayta urinish
            </Button>
          </div>
        </div>
      ) : data && data.items.length === 0 ? (
        <Empty view={view} q={q} onNew={() => router.push(`${BASE}/yangi`)} />
      ) : (
        <>
          {/* desktop table */}
          <div className="ds-table-wrap ds-desktop-only" aria-busy={!data || undefined}>
            <table className="ds-table">
              <caption className="ds-sr-only">{VIEW_LABEL[view]} buyurtmalar</caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("date")}>
                    <button onClick={() => sortBy("date")}>
                      Sana <StudioIcon name="chevron-down" size={16} style={{ transform: ariaSort("date") === "ascending" ? undefined : "rotate(180deg)", opacity: sort === "date" ? 1 : 0.4 }} />
                    </button>
                  </th>
                  <th scope="col">Mijoz</th>
                  <th scope="col">Telefon</th>
                  <th scope="col">Joy · tur</th>
                  <th scope="col" data-num aria-sort={ariaSort("total")}>
                    <button onClick={() => sortBy("total")}>
                      Summa <StudioIcon name="chevron-down" size={16} style={{ opacity: sort === "total" ? 1 : 0.4, transform: ariaSort("total") === "ascending" ? "rotate(180deg)" : undefined }} />
                    </button>
                  </th>
                  <th scope="col" data-num aria-sort={ariaSort("balance")}>
                    <button onClick={() => sortBy("balance")}>
                      Qoldiq <StudioIcon name="chevron-down" size={16} style={{ opacity: sort === "balance" ? 1 : 0.4, transform: ariaSort("balance") === "ascending" ? "rotate(180deg)" : undefined }} />
                    </button>
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
                        onClick={() => open(o.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            open(o.id);
                          }
                        }}
                      >
                        <td className="c-date">{rowDate(o.date)}</td>
                        <td className="c-client">{o.client}</td>
                        <td className="c-phone">{fmtPhone(o.phone)}</td>
                        <td className="c-place">{[o.venue, eventLabel(o.eventType)].filter(Boolean).join(" · ")}</td>
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
            {data && (
              <div className="ds-table-foot">
                <span className="ds-label ds-secondary">
                  {first}–{last} · jami {data.total}
                </span>
                <div>
                  <button className="ds-iconbtn" data-style="secondary" aria-label="Oldingi sahifa" disabled={page <= 1} onClick={() => nav({ page: page - 1 > 1 ? String(page - 1) : null })}>
                    <StudioIcon name="chevron-left" />
                  </button>
                  <button className="ds-iconbtn" data-style="secondary" aria-label="Keyingi sahifa" disabled={last >= data.total} onClick={() => nav({ page: String(page + 1) })}>
                    <StudioIcon name="chevron-right" />
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

      {isNew && ctx && (
        <OrderForm
          date={newDate && isISODate(newDate) ? newDate : undefined}
          onClose={closeLayer}
          onSaved={(r) => {
            router.replace(`${BASE}/${r.order.id}`, { scroll: false });
            setToast({ id: Date.now(), text: r.warnings.includes("capacity_exceeded") ? "Saqlandi · bu kunda sigʻim toʻlgan" : r.warnings.includes("day_blocked") ? "Saqlandi · bu kun yopiq edi" : "Buyurtma saqlandi" });
          }}
        />
      )}
      {openId && ctx && <OrderDetail key={openId} id={openId} onClose={closeLayer} toast={setToast} />}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

function Empty({ view, q, onNew }: { view: OrderView; q: string; onNew(): void }) {
  const [title, text] = q
    ? ["Topilmadi", `“${q}” boʻyicha buyurtma yoʻq. Ism, telefon yoki joyni tekshiring.`]
    : view === "debt"
      ? ["Qoldiq yoʻq", "Hamma buyurtmalar toʻliq toʻlangan."]
      : view === "upcoming"
        ? ["Kelgusi buyurtma yoʻq", "Birinchi buyurtmani qoʻshing — u kalendarda ham koʻrinadi."]
        : view === "past"
          ? ["Oʻtgan buyurtma yoʻq", "Tadbir oʻtgach, buyurtma shu yerga tushadi."]
          : ["Bekor qilingan yoʻq", "Bekor qilingan buyurtmalar shu yerda saqlanadi."];
  return (
    <div className="ds-empty ds-card">
      <span className="ds-empty-icon" aria-hidden>
        <StudioIcon name={q ? "search" : view === "debt" ? "check" : "clipboard-text"} size={24} />
      </span>
      <h2 className="ds-h3">{title}</h2>
      <p className="ds-body ds-secondary">{text}</p>
      {view === "upcoming" && !q && (
        <div style={{ marginTop: "var(--ds-space-8)" }}>
          <Button icon={<StudioIcon name="plus" />} onClick={onNew}>
            Buyurtma qoʻshish
          </Button>
        </div>
      )}
    </div>
  );
}
