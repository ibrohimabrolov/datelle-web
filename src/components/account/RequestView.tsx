"use client";

import Link from "next/link";
import { useState } from "react";
import { catalogHref, eventLabel, fmtSum } from "@/data/catalog";
import { dayLabel } from "@/lib/dates";
import { ApiError, api, useApi } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Button, buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";
import { Stepper } from "@/components/ui/Stepper";
import { LoginGate } from "./LoginGate";
import { STATUS_LABEL, TONE_CLASS, stepsFor, type RequestView as R } from "./status";

/* B4 · Soʻrov yuborildi — and the request's living status page afterwards */
export function RequestView({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<{ request: R }>(`/api/requests/${id}`);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  if (error?.status === 401) return <LoginGate title="Soʻrovni koʻrish uchun kiring" onDone={reload} />;
  if (error)
    return (
      <Container wide className="flex flex-col items-center gap-5 py-24 text-center">
        <h1 className="t-h2">{error.status === 404 ? "Soʻrov topilmadi" : "Yuklab boʻlmadi"}</h1>
        <p className="t-body-m text-ink-2">{error.status === 404 ? "Havola eskirgan yoki bu soʻrov boshqa raqamga tegishli." : error.message}</p>
        <Link href="/bronlarim" className={buttonClass("primary", "lg")}>
          Bronlarim
        </Link>
      </Container>
    );
  if (!data || loading) return <div className="min-h-[70vh]" aria-busy />;

  const r = data.request;
  const st = STATUS_LABEL[r.status];
  const fresh = r.status === "pending";
  const ended = ["declined", "expired", "cancelled"].includes(r.status);
  const rows: [string, string][] = [
    ["Soʻrov raqami", r.code],
    ["Sana", dayLabel(r.eventDate)],
    ...(r.type === "booking"
      ? ([["Paket", r.packageTitle ?? "—"], ["Narx", r.price ? `${fmtSum(r.price)} · zadatok ${fmtSum(r.deposit ?? 0)}` : "—"]] as [string, string][])
      : ([
          ["Tadbir", [r.eventType ? eventLabel(r.eventType) : null, r.guests ? `${r.guests} mehmon` : null, r.venue].filter(Boolean).join(" · ") || "—"],
          ["Byudjet", r.budget ? `${r.budget}${/mln/.test(r.budget) ? " soʻm" : ""}` : "—"],
        ] as [string, string][])),
  ];

  const cancel = async () => {
    setBusy(true);
    setErr(undefined);
    try {
      await api(`/api/requests/${r.id}/cancel`, { body: {} });
      setConfirm(false);
      reload();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container wide className="flex flex-col items-center gap-8 pt-16 pb-24 text-center lg:pt-24 lg:pb-32">
      <span className={`grid size-16 place-items-center rounded-full ${ended ? "bg-surface-subtle text-ink-2" : "bg-brand text-white"}`}>
        <Icon name={ended ? "x" : r.status === "pending" ? "check" : "shieldCheck"} size={28} />
      </span>
      <div className="flex max-w-[720px] flex-col items-center gap-3">
        <h1 className="text-[32px] leading-10 font-bold tracking-[-0.025em] sm:t-h1">
          {fresh ? `Soʻrov ${r.vendor.name}’ga yuborildi` : st.label}
        </h1>
        <p className="max-w-[540px] t-body-m text-ink-2 sm:t-body-l">
          {fresh
            ? `${r.vendor.name} odatda ${r.vendor.responseHours} soatda javob beradi. ${r.type === "quote" ? "Taklif kelganda" : "Tasdiqlaganda"} SMS orqali xabar beramiz.`
            : r.status === "expired"
              ? "Studiya belgilangan vaqtda javob bermadi. Shu sanaga boshqa boʻsh studiyalarni koʻring."
              : r.status === "declined"
                ? "Bu sana studiyaga toʻgʻri kelmadi. Shu kunga boshqa boʻsh studiyalar bor."
                : r.status === "cancelled"
                  ? "Soʻrov bekor qilindi. Pul yechilmagan."
                  : `${r.vendor.name} bilan bron jarayoni davom etmoqda.`}
        </p>
        <span className={`rounded-full px-3 py-1 t-cap-m ${TONE_CLASS[st.tone]}`}>{st.label}</span>
      </div>

      <div className="flex w-full max-w-[640px] flex-col gap-5 rounded-3xl border border-line bg-surface p-6 text-left sm:p-7">
        <dl className="flex flex-col gap-3">
          {rows.map(([k, val]) => (
            <div key={k} className="flex items-start justify-between gap-6 t-body-s">
              <dt className="shrink-0 text-ink-3">{k}</dt>
              <dd className="text-right text-ink">{val}</dd>
            </div>
          ))}
        </dl>
        <hr className="border-line" />
        <Stepper steps={stepsFor(r)} />
        {r.status === "confirmed" && (
          <p className="rounded-lg bg-info-subtle px-3 py-2 t-cap-m text-info-subtle-text">Onlayn toʻlov (Payme/Click) tez orada ulanadi — hozircha jamoamiz siz bilan bogʻlanadi.</p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={catalogHref({ sana: r.eventDate, tur: r.vendor.category === "floristika" ? "floristika" : "dekor" })} className={buttonClass("secondary", "lg")}>
          Boshqa studiyalarni koʻrish
        </Link>
        <Link href="/bronlarim" className={buttonClass("primary", "lg")}>
          Bronlarimga oʻtish
        </Link>
      </div>

      {["pending", "confirmed"].includes(r.status) &&
        (confirm ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-5">
            <span className="t-body-sm">Soʻrovni bekor qilasizmi? Studiyaga xabar beramiz.</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" onClick={() => setConfirm(false)} disabled={busy}>
                Yoʻq
              </Button>
              <button type="button" onClick={cancel} disabled={busy} className="inline-flex h-11 items-center rounded-lg bg-error px-4 text-[14px] font-semibold text-white disabled:opacity-50">
                {busy ? "Bekor qilinmoqda…" : "Ha, bekor qilish"}
              </button>
            </div>
            {err && <span className="t-cap text-error">{err}</span>}
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="t-body-sm text-ink-2 underline-offset-4 hover:text-error hover:underline">
            Soʻrovni bekor qilish
          </button>
        ))}
    </Container>
  );
}
