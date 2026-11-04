import type { ReactNode } from "react";
import { Container, Eyebrow } from "@/components/ui/Primitives";

export type Section = { h: string; body: ReactNode };

/* Info / legal page — Figma Web type scale, 720px measure */
export function TextPage({ eyebrow, title, lead, sections, note, aside }: { eyebrow: string; title: string; lead?: string; sections: Section[]; note?: string; aside?: ReactNode }) {
  return (
    <Container wide className="flex flex-col gap-12 pt-12 pb-24 lg:pt-24 lg:pb-32">
      <div className="flex max-w-[960px] flex-col items-start gap-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="text-[40px] leading-[44px] font-bold tracking-[-0.03em] sm:t-display">{title}</h1>
        {lead && <p className="max-w-[640px] t-body-m text-ink-2 sm:t-body-l">{lead}</p>}
        {note && <p className="rounded-lg bg-warning-subtle px-3 py-2 t-cap-m text-warning-subtle-text">{note}</p>}
      </div>
      <div className="flex flex-col gap-12 lg:flex-row lg:gap-24">
        <div className="flex max-w-[720px] flex-1 flex-col gap-10">
          {sections.map((s, i) => (
            <section key={s.h} className="flex flex-col gap-3 border-t border-line pt-6">
              <h2 className="t-h3">
                <span className="mr-3 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                {s.h}
              </h2>
              <div className="flex flex-col gap-3 t-body-m text-ink-2">{s.body}</div>
            </section>
          ))}
        </div>
        {aside && <aside className="w-full lg:w-[424px] lg:shrink-0">{aside}</aside>}
      </div>
    </Container>
  );
}
