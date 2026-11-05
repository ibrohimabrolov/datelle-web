"use client";

import Link from "next/link";
import { useApi } from "@/lib/api";
import { Card, Empty, ErrorNote, PageHead } from "./kit";
import { RequestRow, type AdminRequest } from "./Requests";

type Stats = {
  today: number; week: number; total: number; pending: number; confirmed: number; paid: number; acceptRate: number | null;
  newApplications: number; openLeads: number; users: number; activeVendors: number;
};

export function Dashboard() {
  const stats = useApi<Stats>("/api/admin/stats");
  const pending = useApi<{ requests: AdminRequest[] }>("/api/admin/requests?holat=pending");
  const s = stats.data;

  const tiles: { label: string; value: string | number | undefined; href?: string; hot?: boolean }[] = [
    { label: "Javob kutilmoqda", value: s?.pending, href: "/admin/sorovlar?holat=pending", hot: !!s?.pending },
    { label: "Bugun kelgan soʻrovlar", value: s?.today },
    { label: "Soʻnggi 7 kunda", value: s?.week },
    { label: "Tasdiqlanish ulushi", value: s ? (s.acceptRate === null ? "—" : `${s.acceptRate}%`) : undefined },
    { label: "Zadatok kutilmoqda", value: s?.confirmed, href: "/admin/sorovlar?holat=confirmed" },
    { label: "Yangi hamkor arizalari", value: s?.newApplications, href: "/admin/arizalar", hot: !!s?.newApplications },
    { label: "Ochiq lidlar", value: s?.openLeads, href: "/admin/lidlar", hot: !!s?.openLeads },
    { label: "Faol studiyalar", value: s?.activeVendors, href: "/admin/studiyalar" },
  ];

  return (
    <>
      <PageHead title="Umumiy" sub={s ? `Jami ${s.total} ta soʻrov · ${s.users} ta foydalanuvchi` : " "} />
      {stats.error && <ErrorNote error={stats.error} onRetry={stats.reload} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="t-body-s text-ink-2">{t.label}</span>
              {t.value === undefined ? (
                <span className="mt-2 block h-10 w-16 animate-pulse rounded-md bg-surface-subtle" />
              ) : (
                <span className={`mt-2 block t-kpi ${t.hot ? "text-brand" : "text-ink"}`}>{t.value}</span>
              )}
            </>
          );
          const cls = "flex flex-col rounded-xl border border-line bg-surface p-5";
          return t.href ? (
            <Link key={t.label} href={t.href} className={`${cls} transition-colors hover:border-line-strong`}>
              {body}
            </Link>
          ) : (
            <div key={t.label} className={cls}>
              {body}
            </div>
          );
        })}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="t-title text-ink">Javob kutilayotganlar</h2>
          <Link href="/admin/sorovlar?holat=pending" className="t-body-sb text-brand">
            Hammasi
          </Link>
        </div>
        {pending.error ? (
          <ErrorNote error={pending.error} onRetry={pending.reload} />
        ) : !pending.data ? (
          <Card className="h-[120px] animate-pulse" />
        ) : pending.data.requests.length === 0 ? (
          <Empty>Hozircha javob kutayotgan soʻrov yoʻq</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.data.requests.slice(0, 5).map((r) => (
              <RequestRow key={r.id} r={r} onChanged={() => (pending.reload(), stats.reload())} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
