"use client";

import Image from "next/image";
import Link from "next/link";
import { catalogHref, fmtSum } from "@/data/catalog";
import { imageFor } from "@/data/images";
import { dayLabel } from "@/lib/dates";
import { useApi } from "@/lib/api";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Container } from "@/components/ui/Primitives";
import { logout, useSession } from "@/components/auth/session";
import { LoginGate } from "./LoginGate";
import { STATUS_LABEL, TONE_CLASS, fmtTime, type RequestView } from "./status";

/* C1 · Bronlarim */
export function MyRequests() {
  const session = useSession();
  const { data, error, reload } = useApi<{ items: RequestView[] }>(session.status === "user" ? "/api/requests" : null);

  if (session.status === "unknown") return <div className="min-h-[70vh]" aria-busy />;
  if (session.status === "anon" || error?.status === 401)
    return <LoginGate title="Bronlarim" lead="Soʻrov va bronlaringizni koʻrish uchun telefon raqamingizni tasdiqlang." onDone={reload} />;

  const items = data?.items;
  const open = items?.filter((r) => ["pending", "confirmed", "paid"].includes(r.status)) ?? [];
  const past = items?.filter((r) => !["pending", "confirmed", "paid"].includes(r.status)) ?? [];

  return (
    <Container wide className="flex flex-col gap-10 pt-10 pb-24 lg:pt-16 lg:pb-32">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] leading-10 font-bold tracking-[-0.025em] sm:t-h1">Bronlarim</h1>
          <p className="t-body-s text-ink-2">
            {session.user?.name ? `${session.user.name} · ` : ""}
            {session.user?.phone}
          </p>
        </div>
        <button type="button" onClick={() => void logout()} className="w-fit t-body-sm text-ink-2 hover:text-ink hover:underline">
          Chiqish
        </button>
      </div>

      {error && <p className="t-body-m text-error">{error.message}</p>}
      {!items && !error && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-[112px] animate-pulse rounded-2xl bg-surface-subtle" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-surface px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand-subtle text-brand">
            <Icon name="calendar" size={26} />
          </span>
          <h2 className="t-h3">Hali soʻrov yoʻq</h2>
          <p className="max-w-[420px] t-body-m text-ink-2">Sanani tanlang — shu kuni boʻsh studiyalarni koʻrsatamiz.</p>
          <Link href={catalogHref()} className={buttonClass("primary", "lg")}>
            Studiyalarni koʻrish
          </Link>
        </div>
      )}

      {open.length > 0 && <Group title="Faol" items={open} />}
      {past.length > 0 && <Group title="Oldingilar" items={past} />}
    </Container>
  );
}

function Group({ title, items }: { title: string; items: RequestView[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">{title}</h2>
      <ul className="flex flex-col gap-3">
        {items.map((r) => {
          const st = STATUS_LABEL[r.status];
          return (
            <li key={r.id}>
              <Link href={`/sorov/${r.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:gap-5">
                <span className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                  <Image src={imageFor(r.vendor.imageKey)} alt="" fill sizes="80px" className="object-cover" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="t-title">{r.vendor.name}</span>
                    <span className={`rounded-full px-2.5 py-0.5 t-cap-m ${TONE_CLASS[st.tone]}`}>{st.label}</span>
                  </span>
                  <span className="t-body-s text-ink-2">
                    {dayLabel(r.eventDate)} · {r.type === "booking" ? (r.packageTitle ?? "Bron") : "Individual taklif"}
                  </span>
                  <span className="t-cap text-ink-3">
                    {r.code}
                    {r.price ? ` · ${fmtSum(r.price)}` : ""}
                    {r.status === "pending" ? ` · javob ${fmtTime(r.respondBy)} gacha` : ""}
                  </span>
                </span>
                <Icon name="chevronRight" className="hidden shrink-0 text-ink-3 sm:block" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
