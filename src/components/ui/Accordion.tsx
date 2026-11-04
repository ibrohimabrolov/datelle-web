"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/* Accordion — D1 FAQ (border-top rows, py20, Title + chevron) */
export function Accordion({ items, defaultOpen = 0 }: { items: { q: string; a: ReactNode }[]; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  return (
    <div className="flex flex-col border-b border-line">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className="border-t border-line">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`acc-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className={`flex w-full items-center justify-between gap-6 pt-5 text-left transition-[padding] duration-300 ${isOpen ? "pb-3" : "pb-5"}`}
            >
              <span className="t-title">{it.q}</span>
              <Icon name="chevronDown" className={`shrink-0 text-ink-2 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div id={`acc-${i}`} className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="max-w-[800px] pb-5 t-body-m text-ink-2">{it.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
