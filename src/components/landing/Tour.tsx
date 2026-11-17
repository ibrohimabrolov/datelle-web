"use client";

import { useState } from "react";
import { TOUR } from "./data";
import { Img } from "./ui";

/* Landing/Tour · Size=Desktop (Figma 271:2963): tabs + 1120×600 stage with real product screens. */
export function Tour() {
  const [active, setActive] = useState(0);
  const tab = TOUR[active];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : TOUR.length - 1)) % TOUR.length;
    setActive(next);
    document.getElementById(`tour-tab-${TOUR[next].id}`)?.focus();
  };

  return (
    <div className="lp-tour">
      <div className="lp-tabs" role="tablist" aria-label="Ilova ekranlari" onKeyDown={onKey}>
        {TOUR.map((t, i) => (
          <button
            key={t.id}
            id={`tour-tab-${t.id}`}
            className="lp-tab"
            role="tab"
            aria-selected={i === active}
            aria-controls="tour-panel"
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lp-stage" id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${tab.id}`}>
        {TOUR.map((t, i) =>
          (["light", "dark"] as const).map((mode) => (
            <Img
              key={`${t.id}-${mode}`}
              className={`lp-shot lp-shot--${mode}`}
              data-active={i === active}
              src={`/landing/tour/${t.id}-${mode}.webp`}
              alt={i === active && mode === "light" ? t.alt : ""}
              aria-hidden={i !== active || mode === "dark" || undefined}
              width={1120}
              height={600}
              loading={i === 0 ? "eager" : "lazy"}
            />
          )),
        )}
      </div>
      <p className="lp-tour__caption">{tab.caption}</p>
    </div>
  );
}
