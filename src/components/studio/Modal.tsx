"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { StudioIcon } from "./icons";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* Second layer above an Overlay: centered 480/420/560 dialog on desktop, bottom sheet on mobile.
   Esc closes only this layer (stopPropagation), focus is trapped and returned.
   variant "dialog" = Figma Overlays/Dialog: [3D media] · H2 title + description (gap 4) · body · footer,
   gap 20, no header row; the ✕ only when `closeButton` (Obuna tugadi). "alert" = role alertdialog (confirm). */
export function Modal({
  title,
  description,
  media,
  size,
  variant = "panel",
  closeButton = variant === "panel",
  alert,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  media?: ReactNode;
  size?: "sm" | "lg";
  variant?: "panel" | "dialog";
  closeButton?: boolean;
  alert?: boolean;
  onClose(): void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
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
      <div
        ref={ref}
        className="ds-modal"
        data-size={size}
        data-variant={variant}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        {variant === "dialog" ? (
          <>
            {media && <div className="ds-dialog-media">{media}</div>}
            <div className="ds-dialog-head" data-close={closeButton || undefined}>
              <h2 id={titleId} className="ds-h2">
                {title}
              </h2>
              {description && (
                <p id={descId} className="ds-body ds-secondary">
                  {description}
                </p>
              )}
            </div>
            {closeButton && (
              <button className="ds-iconbtn ds-dialog-close" data-style="ghost" onClick={onClose} aria-label="Yopish">
                <StudioIcon name="cross" />
              </button>
            )}
          </>
        ) : (
          <div className="ds-panelhead" style={{ display: "flex" }}>
            <h2 id={titleId} className="ds-h3">
              {title}
            </h2>
            {closeButton && (
              <button className="ds-iconbtn" data-style="ghost" onClick={onClose} aria-label="Yopish">
                <StudioIcon name="cross" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </>
  );
}

/* Figma Overlays/Dialog (420, 58:198): question title, consequence, "Ortga" + verb-led confirm side by side.
   Focus lands on the safe button; Enter never fires the destructive one by default. */
export function ConfirmDialog({
  title,
  description,
  confirm,
  cancel = "Ortga",
  tone = "primary",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirm: string;
  cancel?: string;
  tone?: "primary" | "destructive";
  onConfirm(): Promise<unknown> | void;
  onClose(): void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title={title} description={description} size="sm" variant="dialog" alert onClose={onClose}>
      {err && (
        <p className="ds-alert" role="alert">
          {err}
        </p>
      )}
      <div className="ds-modal-foot" data-split>
        <Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus>
          {cancel}
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
type MenuItem = { label: string; icon?: ReactNode; danger?: boolean; disabled?: boolean; checked?: boolean; meta?: string; onSelect(): void };
/* trigger: text button (ghost, or secondary with an icon); items with `checked` become a radio list (month filter) */
export function Menu({ label, trigger, triggerIcon, triggerStyle = "ghost", items }: { label: string; trigger?: string; triggerIcon?: ReactNode; triggerStyle?: "ghost" | "secondary"; items: MenuItem[] }) {
  const radio = items.some((it) => it.checked !== undefined);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    (wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? wrap.current?.querySelector<HTMLElement>('[role^="menuitem"]'))?.focus();
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
      {trigger ? (
        <button ref={btn} type="button" className="ds-btn" data-style={triggerStyle} data-size="m" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {triggerIcon}
          <span>{trigger}</span>
        </button>
      ) : (
        <button ref={btn} className="ds-iconbtn" data-style="secondary" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <StudioIcon name="more-horiz" variant="Filled" />
        </button>
      )}
      {open && (
        <div
          className="ds-menu"
          role="menu"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const els = [...(wrap.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
            const i = els.indexOf(document.activeElement as HTMLElement);
            els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
          }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              role={radio ? "menuitemradio" : "menuitem"}
              aria-checked={radio ? Boolean(it.checked) : undefined}
              disabled={it.disabled}
              data-danger={it.danger || undefined}
              onClick={() => {
                setOpen(false);
                btn.current?.focus();
                it.onSelect();
              }}
            >
              {it.icon}
              <span className="ds-menu-label">{it.label}</span>
              {it.meta && <span className="ds-menu-meta">{it.meta}</span>}
              {radio && it.checked && <StudioIcon name="check" size={20} className="ds-menu-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
