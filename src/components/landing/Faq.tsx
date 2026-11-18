"use client";

import { useState } from "react";
import { FAQ } from "./data";
import { Minus, Plus } from "./icons";

/* Landing/FAQ (Figma 292:3689): category tabs + accordion. First answer open by default. */
export function Faq() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const set = FAQ[tab];

  return (
    <div className="lp-faq">
      <div className="lp-tabs" role="tablist" aria-label="Savollar mavzusi">
        {FAQ.map((t, i) => (
          <button
            key={t.id}
            className="lp-tab"
            role="tab"
            aria-selected={i === tab}
            onClick={() => {
              setTab(i);
              setOpen(0);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lp-faq__list" role="tabpanel">
        {set.items.map((it, i) => {
          const isOpen = open === i;
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
    </div>
  );
}
