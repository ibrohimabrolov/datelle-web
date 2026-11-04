"use client";

import { useState } from "react";
import { FAQ } from "@/data/home";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Container } from "@/components/ui/Primitives";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-bg-primary">
      <Container className="flex flex-col items-center gap-10 py-20 lg:gap-14 lg:py-[120px]">
        <h2 className="lines max-w-[800px] text-center text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">
          <span>Bron qilishdan oldin</span>
          <span>bilish kerak boʻlganlar.</span>
        </h2>

        <div className="w-full max-w-[840px]">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`flex w-full items-center justify-between gap-6 pt-6 text-left transition-[padding] duration-300 ${isOpen ? "pb-3" : "pb-6"}`}
                >
                  <span className="t-title">{f.q}</span>
                  <Icon name="chevronDown" className={`shrink-0 text-ink-2 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <div
                  id={`faq-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[720px] pb-6 t-body-m text-ink-2">
                      {f.a}
                      {f.link && (
                        <>
                          {" "}
                          <Link href={f.link.href} className="font-semibold text-brand underline-offset-4 hover:underline">
                            {f.link.label} →
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex w-full max-w-[840px] flex-col items-start justify-between gap-5 rounded-2xl bg-brand py-7 pr-7 pl-6 sm:flex-row sm:items-center sm:pl-8">
          <div className="flex flex-col gap-1">
            <span className="t-title text-white">Savolingiz qoldimi?</span>
            <span className="t-body-s text-ink-inverse-muted">Telegram’da yozing — jamoamiz javob beradi.</span>
          </div>
          <a
            href={BRAND.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-4 text-[14px] leading-[18px] font-semibold text-ink transition-colors hover:bg-surface-subtle"
          >
            Telegram’ga yozish
          </a>
        </div>
      </Container>
    </section>
  );
}
