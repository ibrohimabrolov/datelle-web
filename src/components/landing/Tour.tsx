"use client";

import { useRef, useState } from "react";
import { TOUR } from "./data";

/* Landing/Tour (Figma 271:2963)
   · Size=Desktop — tabs + 1120×600 stage with real product screens (one export per tab and theme).
   · Size=Mobile (< 1024px) — the same tabs over a 480px stage with one Mini App screen per tab.
   <picture> picks the right file per breakpoint, so phones never download the 2240px desktop shots. */
const MOBILE = "(max-width: 1023.98px)";

export function Tour() {
  const [active, setActive] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tab = TOUR[active];

  const select = (i: number, focus = false) => {
    setActive(i);
    const list = tabsRef.current;
    const btn = document.getElementById(`tour-tab-${TOUR[i].id}`);
    if (focus) btn?.focus({ preventScroll: true });
    // Mobile: tabs scroll sideways — keep the chosen one fully in view without moving the page
    if (list && btn && list.scrollWidth > list.clientWidth) {
      const left = btn.offsetLeft - (list.clientWidth - btn.offsetWidth) / 2;
      list.scrollTo({ left, behavior: "smooth" });
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    select((active + (e.key === "ArrowRight" ? 1 : TOUR.length - 1)) % TOUR.length, true);
  };

  return (
    <div className="lp-tour">
      <div className="lp-tabs" role="tablist" aria-label="Ilova ekranlari" onKeyDown={onKey} ref={tabsRef}>
        {TOUR.map((t, i) => (
          <button
            key={t.id}
            id={`tour-tab-${t.id}`}
            className="lp-tab"
            role="tab"
            aria-selected={i === active}
            aria-controls="tour-panel"
            tabIndex={i === active ? 0 : -1}
            onClick={() => select(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lp-stage" id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${tab.id}`}>
        {TOUR.map((t, i) =>
          (["light", "dark"] as const).map((mode) => (
            <picture key={`${t.id}-${mode}`} className={`lp-shot lp-shot--${mode}`} data-active={i === active}>
              <source media={MOBILE} srcSet={`/landing/tour/m/${t.id}-${mode}.webp`} width={480} height={864} />
              <img
                src={`/landing/tour/${t.id}-${mode}.webp`}
                alt={i === active ? t.alt : ""}
                aria-hidden={i !== active || undefined}
                width={1120}
                height={600}
                decoding="async"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </picture>
          )),
        )}
      </div>
      <p className="lp-tour__caption">{tab.caption}</p>
    </div>
  );
}
