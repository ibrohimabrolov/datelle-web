import type { ReactNode } from "react";
import { BRAND } from "@/config/brand";
/* Illustration (Figma) — not live data */
const DAYS = [
  { wd: "Pa", d: 11, free: 35 },
  { wd: "Ju", d: 12, free: 34 },
  { wd: "Sh", d: 13, free: 6 },
  { wd: "Ya", d: 14, free: 4 },
];
import { Icon } from "@/components/ui/Icon";
import { Container } from "@/components/ui/Primitives";

function MiniTile({ wd, d, n, selected }: { wd: string; d: number; n: number; selected?: boolean }) {
  return (
    <div className={`flex w-[54px] flex-col items-center gap-0.5 rounded-xl py-2.5 ${selected ? "bg-brand text-white" : "bg-surface-subtle"}`}>
      <span className={`t-cap ${selected ? "text-white/72" : "text-ink-3"}`}>{wd}</span>
      <span className="text-[18px] leading-6 font-semibold">{d}</span>
      <span className={`t-cap ${selected ? "text-white/80" : "text-brand"}`}>{n}</span>
    </div>
  );
}

function Radio({ on }: { on?: boolean }) {
  return <span className={`size-4 shrink-0 rounded-full bg-white ${on ? "border-[5px] border-brand" : "border-[1.5px] border-line-strong"}`} />;
}

const STEPS: { title: string; text: string; visual: ReactNode }[] = [
  {
    title: "Sanani tanlang",
    text: "Har kuni nechta studiya boʻshligini darhol koʻrasiz.",
    visual: (
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {DAYS.map((d) => (
            <MiniTile key={d.d} wd={d.wd} d={d.d} n={d.free} selected={d.d === 12} />
          ))}
        </div>
        <span className="t-cap-m text-ink-2">12-iyun · 34 ta boʻsh studiya</span>
      </div>
    ),
  },
  {
    title: "Studiya va paket",
    text: "Narx, tarkib va bekor qilish shartlari toʻlovdan oldin koʻrinadi.",
    visual: (
      <div className="flex w-full flex-col gap-1.5 rounded-xl border-[1.5px] border-brand bg-brand-subtle p-4">
        <span className="t-body-sb">Toʻy dasturxoni — Standart</span>
        <span className="t-cap text-ink-2">Sahna · Fon · Jonli gul</span>
        <span className="t-title text-brand">3 000 000 soʻm</span>
      </div>
    ),
  },
  {
    title: "Zadatok toʻlang",
    text: `Payme yoki Click orqali. Pul ${BRAND.name} kafolati ostida.`,
    visual: (
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-brand bg-brand-subtle px-3.5 py-3">
          <Radio on />
          <span className="t-body-sb">Payme</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-surface-subtle px-3.5 py-3">
          <Radio />
          <span className="t-body-sm">Click</span>
        </div>
        <span className="pt-1 text-center t-title">1 020 000 soʻm</span>
      </div>
    ),
  },
  {
    title: "Tasdiq",
    text: "Studiya 6 soat ichida tasdiqlaydi va kontaktlar ochiladi.",
    visual: (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid place-items-center rounded-full bg-success p-3.5 text-white">
          <Icon name="check" size={24} />
        </span>
        <span className="t-title">Bron tasdiqlandi</span>
        <span className="t-cap text-ink-2">Gulnoza Decor · +998 90 555 12 34</span>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="qanday-ishlaydi" className="scroll-mt-6 bg-surface">
      <Container className="flex flex-col items-center gap-10 py-20 lg:gap-14 lg:py-[120px]">
        <div className="flex max-w-[800px] flex-col items-center gap-5 text-center">
          <h2 className="lines text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">
            <span>Sanadan tasdiqqacha —</span>
            <span>toʻrt qadam.</span>
          </h2>
          <p className="t-body-m text-ink-2 sm:t-body-l">Qoʻngʻiroq va Direct yozishmalarsiz.</p>
        </div>
        <ol className="grid w-full grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-6 rounded-3xl bg-surface-subtle px-3 pt-3 pb-7">
              <div className="flex h-[220px] items-center justify-center rounded-2xl bg-surface px-5">{s.visual}</div>
              <div className="flex flex-col gap-2 pr-1 pl-3">
                <span className="t-kpi text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="t-h3">{s.title}</h3>
                <p className="t-body-m text-ink-2">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
