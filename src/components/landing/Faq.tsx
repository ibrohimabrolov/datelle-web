"use client";

import { useState } from "react";
import type { Copy } from "./copy";
import { Minus, Plus } from "./icons";

/* Landing/FAQ (Figma 292:3689): category tabs + accordion. First answer open by default. */
export function Faq({ t }: { t: Copy }) {
  const FAQ = t.faq;
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="lp-faq">
      <div className="lp-tabs" role="tablist" aria-label={t.a11y.faqTabs}>
        {FAQ.map((t, i) => (
          <button
            key={t.id}
            id={`faq-tab-${t.id}`}
            className="lp-tab"
            role="tab"
            aria-selected={i === tab}
            aria-controls={`faq-panel-${t.id}`}
            onClick={() => {
              setTab(i);
              setOpen(0);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Every tab's Q&A stays in the HTML (inactive panels are `hidden`) so crawlers read all answers. */}
      {FAQ.map((set, ti) => (
        <div
          key={set.id}
          id={`faq-panel-${set.id}`}
          className="lp-faq__list"
          role="tabpanel"
          aria-labelledby={`faq-tab-${set.id}`}
          hidden={ti !== tab}
        >
          {set.items.map((it, i) => {
            const isOpen = ti === tab && open === i;
            const id = `faq-${set.id}-${i}`;
            return (
              <div key={id} className="lp-qa" data-open={isOpen}>
                <button className="lp-qa__q" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? null : i)}>
                  <span>{it.q}</span>
                  <span className="lp-qa__toggle" aria-hidden>{isOpen ? <Minus /> : <Plus />}</span>
                </button>
                <div className="lp-qa__a" id={id} role="region" aria-hidden={!isOpen}>
                  <div>
                    <p className="lp-body">{it.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
