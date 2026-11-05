"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import { dayLabel } from "@/lib/dates";
import { eventLabel } from "@/data/catalog";
import { fmtTime } from "@/components/account/status";
import { Badge, Card, Empty, ErrorNote, PageHead, Rows, SmallButton, Tabs, tel, useMutation, type Tone } from "./kit";

/* ── Partner applications ── */
type AppStatus = "new" | "reviewing" | "approved" | "rejected";
type Application = {
  id: string; studioName: string; category: "dekor" | "floristika"; district: string; instagram: string | null; legalForm: string;
  contactName: string; phone: string; status: AppStatus; createdAt: string;
};
const APP_STATUS: Record<AppStatus, { label: string; tone: Tone }> = {
  new: { label: "Yangi", tone: "warning" },
  reviewing: { label: "Koʻrib chiqilmoqda", tone: "info" },
  approved: { label: "Qabul qilindi", tone: "success" },
  rejected: { label: "Rad etildi", tone: "neutral" },
};

export function ApplicationsPage() {
  const list = useApi<{ applications: Application[] }>("/api/admin/applications");
  const [tab, setTab] = useState<"open" | "done">("open");
  const all = list.data?.applications ?? [];
  const isOpen = (a: Application) => a.status === "new" || a.status === "reviewing";
  const rows = all.filter((a) => (tab === "open" ? isOpen(a) : !isOpen(a)));

  return (
    <>
      <PageHead title="Hamkor arizalari" sub="“Hamkor boʻlish” formasidan kelgan studiyalar. Qoʻngʻiroq qilib, holatini belgilang." />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "open", label: "Ochiq", count: all.filter(isOpen).length },
            { value: "done", label: "Koʻrib chiqilgan", count: all.filter((a) => !isOpen(a)).length },
          ]}
        />
      </div>
      {list.error ? (
        <ErrorNote error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Rows />
      ) : rows.length === 0 ? (
        <Empty>{tab === "open" ? "Yangi ariza yoʻq" : "Hali hech narsa koʻrib chiqilmagan"}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((a) => (
            <ApplicationRow key={a.id} a={a} onChanged={list.reload} />
          ))}
        </div>
      )}
    </>
  );
}

function ApplicationRow({ a, onChanged }: { a: Application; onChanged: () => void }) {
  const m = useMutation();
  const set = (status: AppStatus) => m.run(status, `/api/admin/applications/${a.id}`, { status }, onChanged);
  const ig = a.instagram?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  const next: { to: AppStatus; label: string; variant: "primary" | "secondary" | "danger" }[] =
    a.status === "new"
      ? [{ to: "reviewing", label: "Koʻrib chiqishga olish", variant: "secondary" }, { to: "approved", label: "Qabul qilish", variant: "primary" }, { to: "rejected", label: "Rad etish", variant: "danger" }]
      : a.status === "reviewing"
        ? [{ to: "approved", label: "Qabul qilish", variant: "primary" }, { to: "rejected", label: "Rad etish", variant: "danger" }]
        : [{ to: "reviewing", label: "Qayta ochish", variant: "secondary" }];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-body-sb text-ink">{a.studioName}</span>
            <Badge>{a.category === "floristika" ? "Florist" : "Dekor"}</Badge>
            <Badge tone={APP_STATUS[a.status].tone}>{APP_STATUS[a.status].label}</Badge>
          </div>
          <p className="mt-1 t-body-s text-ink-2">
            {a.district} · {a.legalForm}
            {ig && (
              <>
                {" · "}
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-brand">
                  @{ig}
                </a>
              </>
            )}
          </p>
          <p className="mt-1 t-body-s text-ink-2">
            {a.contactName} ·{" "}
            <a href={`tel:${a.phone}`} className="font-medium text-ink hover:text-brand">
              {tel(a.phone)}
            </a>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <span className="t-cap text-ink-3">Kelgan: {fmtTime(a.createdAt)}</span>
          <div className="flex flex-wrap gap-2">
            {next.map((n) => (
              <SmallButton key={n.to} variant={n.variant} disabled={!!m.busy} onClick={() => set(n.to)}>
                {m.busy === n.to ? "…" : n.label}
              </SmallButton>
            ))}
          </div>
          {m.error && <span className="t-cap text-error">{m.error}</span>}
        </div>
      </div>
    </Card>
  );
}

/* ── Concierge leads ("Biz topib beramiz") ── */
type Lead = { id: string; phone: string; eventDate: string | null; context: Record<string, unknown> | null; handled: boolean; createdAt: string };

const CONTEXT_LABEL: Record<string, string> = { tur: "Tur", tadbir: "Tadbir", tuman: "Tuman", byudjet: "Byudjet", f: "Filtrlar", source: "Manba" };
function contextText(c: Lead["context"]) {
  if (!c) return null;
  return Object.entries(c)
    .filter(([, v]) => v !== "" && v !== null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => {
      const val = k === "tadbir" && typeof v === "string" ? eventLabel(v) : Array.isArray(v) ? v.join(", ") : String(v);
      return `${CONTEXT_LABEL[k] ?? k}: ${val}`;
    })
    .join(" · ");
}

export function LeadsPage() {
  const list = useApi<{ leads: Lead[] }>("/api/admin/leads");
  const [tab, setTab] = useState<"open" | "done">("open");
  const all = list.data?.leads ?? [];
  const rows = all.filter((l) => (tab === "open" ? !l.handled : l.handled));

  return (
    <>
      <PageHead title="Lidlar" sub="Qidiruvda boʻsh studiya topa olmagan va “Biz topib beramiz” deb raqam qoldirganlar." />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "open", label: "Qoʻngʻiroq kutmoqda", count: all.filter((l) => !l.handled).length },
            { value: "done", label: "Bogʻlanilgan", count: all.filter((l) => l.handled).length },
          ]}
        />
      </div>
      {list.error ? (
        <ErrorNote error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Rows />
      ) : rows.length === 0 ? (
        <Empty>{tab === "open" ? "Hamma lidlar bilan bogʻlanilgan" : "Hali hech kim bilan bogʻlanilmagan"}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((l) => (
            <LeadRow key={l.id} l={l} onChanged={list.reload} />
          ))}
        </div>
      )}
    </>
  );
}

function LeadRow({ l, onChanged }: { l: Lead; onChanged: () => void }) {
  const m = useMutation();
  const ctx = contextText(l.context);
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <a href={`tel:${l.phone}`} className="t-body-sb text-ink hover:text-brand">
          {tel(l.phone)}
        </a>
        <p className="mt-1 t-body-s text-ink-2">{l.eventDate ? dayLabel(l.eventDate) : "Sana koʻrsatilmagan"}</p>
        {ctx && <p className="mt-1 t-cap text-ink-3">{ctx}</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <span className="t-cap text-ink-3">Kelgan: {fmtTime(l.createdAt)}</span>
        <SmallButton variant={l.handled ? "secondary" : "primary"} disabled={!!m.busy} onClick={() => m.run("h", `/api/admin/leads/${l.id}`, { handled: !l.handled }, onChanged)}>
          {m.busy ? "…" : l.handled ? "Qayta ochish" : "Bogʻlanildi"}
        </SmallButton>
        {m.error && <span className="t-cap text-error">{m.error}</span>}
      </div>
    </Card>
  );
}
