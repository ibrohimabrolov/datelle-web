"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { StudioIcon } from "./icons";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* Second layer above an Overlay: centered 480/420 dialog on desktop, bottom sheet on mobile.
   Esc closes only this layer (stopPropagation), focus is trapped and returned. */
export function Modal({ title, size, onClose, children }: { title: string; size?: "sm"; onClose(): void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const fine = window.matchMedia("(pointer: fine)").matches;
    ((fine && el.querySelector<HTMLElement>("[data-autofocus]")) || el).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // capture phase so the Overlay underneath never sees this Esc
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <>
      <div className="ds-modal-scrim" onClick={onClose} aria-hidden />
      <div ref={ref} className="ds-modal" data-size={size} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="ds-panelhead" style={{ display: "flex" }}>
          <h2 id={titleId} className="ds-h3">
            {title}
          </h2>
          <button className="ds-iconbtn" data-style="ghost" onClick={onClose} aria-label="Yopish">
            <StudioIcon name="cross" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

/* Figma ConfirmDialog (420): Tone Destructive / Primary, buttons right on desktop */
export function ConfirmDialog({
  title,
  description,
  confirm,
  tone = "primary",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirm: string;
  tone?: "primary" | "destructive";
  onConfirm(): Promise<unknown> | void;
  onClose(): void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title={title} size="sm" onClose={onClose}>
      <p className="ds-body ds-secondary">{description}</p>
      {err && (
        <p className="ds-alert" role="alert">
          {err}
        </p>
      )}
      <div className="ds-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy} data-autofocus>
          Ortga
        </Button>
        <Button
          variant={tone}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await onConfirm();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
              setBusy(false);
            }
          }}
        >
          {confirm}
        </Button>
      </div>
    </Modal>
  );
}

/* ⋯ menu: button + role=menu, arrow keys, Esc returns focus */
export function Menu({ label, items }: { label: string; items: { label: string; icon?: ReactNode; danger?: boolean; onSelect(): void }[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="ds-menu-wrap" ref={wrap}>
      <button ref={btn} className="ds-iconbtn" data-style="secondary" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <StudioIcon name="more-horiz" variant="Filled" />
      </button>
      {open && (
        <div
          className="ds-menu"
          role="menu"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const els = [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
            const i = els.indexOf(document.activeElement as HTMLElement);
            els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
          }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              data-danger={it.danger || undefined}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
