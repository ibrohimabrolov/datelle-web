"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { dayLabel } from "@/lib/dates";
import { eventLabel, fmtSum } from "@/data/catalog";
import { fmtTime, type ReqStatus } from "@/components/account/status";
import { Badge, Card, Empty, ErrorNote, PageHead, Rows, SmallButton, Tabs, tel, useMutation, type Tone } from "./kit";

export type AdminRequest = {
  id: string; code: string; type: "booking" | "quote"; status: ReqStatus; eventDate: string; eventType: string | null;
  guests: number | null; venue: string | null; budget: string | null; notes: string | null; contactName: string; contactPhone: string;
  price: number | null; deposit: number | null; respondBy: string; createdAt: string; packageTitle: string | null;
  vendor: { id: string; slug: string; name: string; category: string };
};

const STATUS: Record<ReqStatus, { label: string; tone: Tone }> = {
  pending: { label: "Javob kutilmoqda", tone: "warning" },
  confirmed: { label: "Zadatok kutilmoqda", tone: "brand" },
  paid: { label: "Zadatok olindi", tone: "success" },
  completed: { label: "Bajarildi", tone: "success" },
  declined: { label: "Rad etildi", tone: "error" },
  expired: { label: "Muddati oʻtdi", tone: "neutral" },
  cancelled: { label: "Bekor qilindi", tone: "neutral" },
};

type Action = { to: string; label: string; variant: "primary" | "danger" | "secondary"; confirm?: string };
const ACTIONS: Partial<Record<ReqStatus, Action[]>> = {
  pending: [
    { to: "confirmed", label: "Tasdiqlash", variant: "primary" },
    { to: "declined", label: "Rad etish", variant: "danger", confirm: "Rad etilsinmi?" },
  ],
  confirmed: [
    { to: "paid", label: "Zadatok olindi", variant: "primary" },
    { to: "cancelled", label: "Bekor qilish", variant: "danger", confirm: "Bekor qilinsinmi?" },
  ],
  paid: [
    { to: "completed", label: "Bajarildi", variant: "secondary" },
    { to: "cancelled", label: "Bekor qilish", variant: "danger", confirm: "Bekor qilinsinmi? Studiya kuni boʻshaydi." },
  ],
};

const FILTERS = [
  { value: "open", label: "Ochiq" },
  { value: "pending", label: "Javob kutilmoqda" },
  { value: "confirmed", label: "Zadatok kutilmoqda" },
  { value: "paid", label: "Toʻlangan" },
  { value: "closed", label: "Yopilgan" },
  { value: "all", label: "Hammasi" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

export function RequestsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const raw = sp.get("holat");
  const filter: Filter = FILTERS.some((f) => f.value === raw) ? (raw as Filter) : "open";
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [query, setQuery] = useState(q.trim());
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const url = `/api/admin/requests?holat=${filter}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
  const list = useApi<{ requests: AdminRequest[] }>(url);

  return (
    <>
      <PageHead title="Soʻrovlar" sub="Studiya tomoni ishga tushguncha soʻrovlarni shu yerdan tasdiqlaysiz yoki rad etasiz." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} options={[...FILTERS]} onChange={(v) => router.replace(v === "open" ? "/admin/sorovlar" : `/admin/sorovlar?holat=${v}`, { scroll: false })} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kod, ism, telefon yoki studiya"
          aria-label="Qidirish"
          className="h-10 w-full rounded-lg border border-line bg-surface px-3 t-body-s text-ink outline-none placeholder:text-ink-3 focus:border-brand lg:w-[300px]"
        />
      </div>
      {list.error ? (
        <ErrorNote error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Rows />
      ) : list.data.requests.length === 0 ? (
        <Empty>{query ? "Hech narsa topilmadi" : "Bu boʻlimda soʻrov yoʻq"}</Empty>
      ) : (
        <div className={`flex flex-col gap-3 transition-opacity ${list.loading ? "opacity-60" : ""}`}>
          {list.data.requests.map((r) => (
            <RequestRow key={r.id} r={r} onChanged={list.reload} />
          ))}
        </div>
      )}
    </>
  );
}

export function RequestRow({ r, onChanged }: { r: AdminRequest; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState<Action | null>(null);
  const m = useMutation();
  const st = STATUS[r.status];
  const [now] = useState(() => Date.now());
  const overdue = r.status === "pending" && new Date(r.respondBy).getTime() < now + 3600_000;

  const act = (a: Action) => m.run(a.to, `/api/admin/requests/${r.id}`, { to: a.to }, () => (setAsk(null), onChanged()));

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-body-sb text-ink">{r.code}</span>
            <Badge tone={r.type === "booking" ? "info" : "neutral"}>{r.type === "booking" ? "Bron" : "Taklif soʻrovi"}</Badge>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <p className="mt-2 t-body-mm text-ink">
            {dayLabel(r.eventDate)} · {r.eventType ? eventLabel(r.eventType) : "Tadbir"}
            {r.guests ? ` · ${r.guests} mehmon` : ""}
          </p>
          <p className="mt-1 t-body-s text-ink-2">
            <Link href={`/studio/${r.vendor.slug}`} target="_blank" className="font-medium text-ink hover:text-brand">
              {r.vendor.name}
            </Link>
            {r.packageTitle && ` · ${r.packageTitle}`}
            {r.price ? ` · ${fmtSum(r.price)}` : r.budget ? ` · byudjet ${r.budget}` : ""}
          </p>
          <p className="mt-1 t-body-s text-ink-2">
            {r.contactName} ·{" "}
            <a href={`tel:${r.contactPhone}`} className="font-medium text-ink hover:text-brand">
              {tel(r.contactPhone)}
            </a>
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <span className={`t-cap ${overdue ? "text-error" : "text-ink-3"}`}>
            {r.status === "pending" ? `Javob muddati: ${fmtTime(r.respondBy)}` : `Kelgan: ${fmtTime(r.createdAt)}`}
          </span>
          <div className="flex flex-wrap gap-2">
            {ask ? (
              <>
                <span className="self-center t-body-s text-ink-2">{ask.confirm}</span>
                <SmallButton variant="danger" disabled={!!m.busy} onClick={() => act(ask)}>
                  {m.busy ? "…" : "Ha"}
                </SmallButton>
                <SmallButton variant="ghost" onClick={() => setAsk(null)}>
                  Yoʻq
                </SmallButton>
              </>
            ) : (
              ACTIONS[r.status]?.map((a) => (
                <SmallButton key={a.to} variant={a.variant} disabled={!!m.busy} onClick={() => (a.confirm ? setAsk(a) : act(a))}>
                  {m.busy === a.to ? "…" : a.label}
                </SmallButton>
              ))
            )}
            <SmallButton variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? "Yopish" : "Batafsil"}
            </SmallButton>
          </div>
          {m.error && <span className="t-cap text-error">{m.error}</span>}
        </div>
      </div>

      {open && (
        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-line pt-4 t-body-s sm:grid-cols-2 lg:grid-cols-4">
          <Detail k="Joy" v={r.venue} />
          <Detail k="Byudjet" v={r.budget} />
          <Detail k="Narx" v={r.price ? fmtSum(r.price) : null} />
          <Detail k="Zadatok (30%)" v={r.deposit ? fmtSum(r.deposit) : null} />
          <Detail k="Yuborilgan" v={fmtTime(r.createdAt)} />
          <Detail k="Studiya turi" v={r.vendor.category === "floristika" ? "Florist" : "Dekor"} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Detail k="Izoh" v={r.notes} />
          </div>
        </dl>
      )}
    </Card>
  );
}

function Detail({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <dt className="t-cap text-ink-3">{k}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-ink">{v || "—"}</dd>
    </div>
  );
}
