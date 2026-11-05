"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApi, useToday } from "@/lib/api";
import { addDays, dayNum, monthLabel, wdShort, weekdayIdx } from "@/lib/dates";
import { fmtSum } from "@/data/catalog";
import { Badge, Card, Empty, ErrorNote, PageHead, Rows, SmallButton, Tabs, useMutation } from "./kit";

type AdminVendor = {
  id: string; slug: string; name: string; category: "dekor" | "floristika"; district: string; priceFrom: number; dailyCapacity: number;
  status: "active" | "hidden"; rating: number; verified: boolean; openRequests: number; busyNext30: number;
};

export function VendorsPage() {
  const list = useApi<{ vendors: AdminVendor[] }>("/api/admin/vendors");
  const [cat, setCat] = useState<"all" | "dekor" | "floristika" | "hidden">("all");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () =>
      (list.data?.vendors ?? []).filter(
        (v) =>
          (cat === "all" || (cat === "hidden" ? v.status === "hidden" : v.category === cat)) &&
          (!q.trim() || v.name.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [list.data, cat, q],
  );
  const all = list.data?.vendors ?? [];

  return (
    <>
      <PageHead title="Studiyalar" sub="Koʻrinish, kunlik sigʻim va yopiq kunlar. Yashirilgan studiya qidiruvda chiqmaydi." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={cat}
          onChange={setCat}
          options={[
            { value: "all", label: "Hammasi", count: all.length },
            { value: "dekor", label: "Dekor", count: all.filter((v) => v.category === "dekor").length },
            { value: "floristika", label: "Florist", count: all.filter((v) => v.category === "floristika").length },
            { value: "hidden", label: "Yashirilgan", count: all.filter((v) => v.status === "hidden").length },
          ]}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Studiya nomi"
          aria-label="Studiya qidirish"
          className="h-10 w-full rounded-lg border border-line bg-surface px-3 t-body-s text-ink outline-none placeholder:text-ink-3 focus:border-brand lg:w-[260px]"
        />
      </div>
      {list.error ? (
        <ErrorNote error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Rows n={6} />
      ) : rows.length === 0 ? (
        <Empty>Studiya topilmadi</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((v) => (
            <VendorRow key={v.id} v={v} onChanged={list.reload} />
          ))}
        </div>
      )}
    </>
  );
}

function VendorRow({ v, onChanged }: { v: AdminVendor; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const m = useMutation();
  const patch = (key: string, body: Partial<AdminVendor>) => m.run(key, `/api/admin/vendors/${v.id}`, body, onChanged);

  return (
    <Card className={`p-4 sm:p-5 ${v.status === "hidden" ? "bg-surface-subtle" : ""}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/studio/${v.slug}`} target="_blank" className="t-body-sb text-ink hover:text-brand">
              {v.name}
            </Link>
            <Badge>{v.category === "floristika" ? "Florist" : "Dekor"}</Badge>
            {v.verified && <Badge tone="brand">Tekshirilgan</Badge>}
            {v.status === "hidden" && <Badge tone="warning">Yashirilgan</Badge>}
          </div>
          <p className="mt-1 t-body-s text-ink-2">
            {v.district} · {fmtSum(v.priceFrom)} dan · ★ {v.rating.toFixed(1)}
          </p>
          <p className="mt-1 t-cap text-ink-3">
            Ochiq soʻrovlar: {v.openRequests} · 30 kunda band: {v.busyNext30} kun
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 items-center rounded-md border border-line-strong" role="group" aria-label="Kunlik sigʻim">
            <button
              aria-label="Sigʻimni kamaytirish"
              disabled={!!m.busy || v.dailyCapacity <= 1}
              onClick={() => patch("cap", { dailyCapacity: v.dailyCapacity - 1 })}
              className="h-full w-8 t-body-sb text-ink-2 hover:text-ink disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[88px] text-center t-body-sm text-ink">{v.dailyCapacity} ta / kun</span>
            <button
              aria-label="Sigʻimni oshirish"
              disabled={!!m.busy || v.dailyCapacity >= 20}
              onClick={() => patch("cap", { dailyCapacity: v.dailyCapacity + 1 })}
              className="h-full w-8 t-body-sb text-ink-2 hover:text-ink disabled:opacity-40"
            >
              +
            </button>
          </div>
          <SmallButton disabled={!!m.busy} onClick={() => patch("verified", { verified: !v.verified })}>
            {v.verified ? "Belgini olish" : "Tekshirildi"}
          </SmallButton>
          <SmallButton disabled={!!m.busy} onClick={() => patch("status", { status: v.status === "active" ? "hidden" : "active" })}>
            {m.busy === "status" ? "…" : v.status === "active" ? "Yashirish" : "Koʻrsatish"}
          </SmallButton>
          <SmallButton variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Yopish" : "Kunlar"}
          </SmallButton>
        </div>
      </div>
      {m.error && <p className="mt-2 t-cap text-error">{m.error}</p>}
      {open && <DaysEditor vendor={v} onChanged={onChanged} />}
    </Card>
  );
}

/* Next 8 weeks as a grid; tap a day to close or reopen it */
function DaysEditor({ vendor, onChanged }: { vendor: AdminVendor; onChanged: () => void }) {
  const today = useToday();
  const days = useApi<{ days: { day: string; booked: number; blocked: boolean }[] }>(`/api/admin/vendors/${vendor.id}/days`);
  const m = useMutation();
  const byDay = new Map((days.data?.days ?? []).map((d) => [d.day, d]));

  if (!today) return null;
  const start = addDays(today, -weekdayIdx(today)); // Monday of this week
  const cells = Array.from({ length: 56 }, (_, i) => addDays(start, i));

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="t-body-sm text-ink">
          {monthLabel(today.slice(0, 7))} — keyingi 8 hafta
        </p>
        <div className="flex flex-wrap gap-3 t-cap text-ink-2">
          <Legend cls="bg-surface border border-line" label="Boʻsh" />
          <Legend cls="bg-warning-subtle" label="1 joy" />
          <Legend cls="bg-surface-subtle" label="Band" />
          <Legend cls="bg-error-subtle" label="Yopilgan" />
        </div>
      </div>
      {days.error ? (
        <ErrorNote error={days.error} onRetry={days.reload} />
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((w) => (
            <span key={w} className="pb-1 text-center t-cap text-ink-3">
              {w}
            </span>
          ))}
          {cells.map((d) => {
            const row = byDay.get(d);
            const past = d < today;
            const blocked = !!row?.blocked;
            const booked = row?.booked ?? 0;
            const left = vendor.dailyCapacity - booked;
            const cls = past
              ? "text-ink-3 opacity-40"
              : blocked
                ? "bg-error-subtle text-error-subtle-text"
                : left <= 0
                  ? "bg-surface-subtle text-ink-2"
                  : left === 1
                    ? "bg-warning-subtle text-warning-subtle-text"
                    : "border border-line bg-surface text-ink hover:border-brand";
            return (
              <button
                key={d}
                disabled={past || !days.data || m.busy === d}
                onClick={() => m.run(d, `/api/admin/vendors/${vendor.id}/days`, { day: d, blocked: !blocked }, () => (days.reload(), onChanged()))}
                title={past ? undefined : blocked ? "Ochish" : "Yopish"}
                aria-label={`${dayNum(d)}, ${wdShort(d)} — ${blocked ? "yopilgan, ochish" : `${Math.max(0, booked)} band, yopish`}`}
                className={`flex h-12 flex-col items-center justify-center rounded-md transition-colors ${cls} ${m.busy === d ? "animate-pulse" : ""}`}
              >
                <span className="t-body-sm">{dayNum(d)}</span>
                {!past && <span className="text-[10px] leading-3">{blocked ? "yopiq" : `${Math.max(0, booked)}/${vendor.dailyCapacity}`}</span>}
              </button>
            );
          })}
        </div>
      )}
      {m.error && <p className="mt-2 t-cap text-error">{m.error}</p>}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ${cls}`} />
      {label}
    </span>
  );
}
