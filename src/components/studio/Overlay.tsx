"use client";

import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import { StudioIcon } from "./icons";
import { usePanel } from "./PanelProvider";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* One modal surface, two shapes (CSS): side panel 480 on desktop, bottom sheet on mobile.
   Modal semantics: focus moves in and is trapped, Esc / scrim / Telegram BackButton close, focus returns to the opener. */
export function Overlay({ title, actions, onClose, children }: { title: string; actions?: ReactNode; onClose(): void; children: ReactNode }) {
  const { tg } = usePanel();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    // keyboard/mouse: land on the primary action; touch: focus the sheet itself (no stray focus ring)
    const fine = window.matchMedia("(pointer: fine)").matches;
    ((fine && el.querySelector<HTMLElement>("[data-autofocus]")) || el).focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const back = () => close();
    tg?.BackButton.show();
    tg?.BackButton.onClick(back);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      tg?.BackButton.offClick(back);
      tg?.BackButton.hide();
      opener?.focus?.({ preventScroll: true });
    };
  }, [tg]);

  // Rendered in place (no portal) so it inherits .studio tokens, theme and Telegram attributes
  return (
    <>
      <div className="ds-scrim" onClick={onClose} aria-hidden />
      <div ref={ref} className="ds-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <span className="ds-grabber" aria-hidden />
        <div className="ds-panelhead" data-actions={actions ? "" : undefined}>
          <h2 id={titleId} className="ds-h3">
            {title}
          </h2>
          <div className="ds-actions">
            {actions}
            <button className="ds-iconbtn" data-style="ghost" onClick={onClose} aria-label="Yopish">
              <StudioIcon name="cross" />
            </button>
          </div>
        </div>
        {/* the sheet hides PanelHeader (Figma); aria-labelledby still names the dialog */}
        {children}
      </div>
    </>
  );
}
