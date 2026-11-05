"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import type { Status } from "@/data/catalog";
import {
  BOOKING_MAX_DAYS, BOOKING_MIN_DAYS, WD_SHORT, addDays, addMonths, dayLabel, dayNum, isBookable, monthDates, monthLabel, monthOf, weekdayIdx,
} from "@/lib/dates";

/* ── Popover: anchored on ≥sm, bottom sheet on mobile ── */
export function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>, onEscape: () => void = close) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onEscape();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref, onEscape]);
}

/* Move focus into a freshly opened panel: selected option first, else first control */
export function useFocusFirst(open: boolean, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open || !panel.current) return;
    const el =
      panel.current.querySelector<HTMLElement>('[aria-selected="true"], [aria-pressed="true"]') ??
      panel.current.querySelector<HTMLElement>("button:not([disabled]), a, input");
    el?.focus({ preventScroll: true });
  }, [open, panel]);
}

type FieldProps = {
  icon: IconName;
  label: string;
  value: string;
  emphasis?: boolean; // Figma: 1.5px brand border (primary filter)
  className?: string;
  align?: "left" | "right";
  panelWidth?: number;
  children: (close: () => void) => ReactNode;
};

/* Search field — Figma 238:129 (h64 · r14 · px16) with a dropdown panel */
export function FilterField({ icon, label, value, emphasis, className = "", align = "left", panelWidth = 320, children }: FieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const tid = `${id}-t`;
  // Esc / selection: close and hand focus back to the trigger
  const close = useCallback(() => {
    setOpen(false);
    document.getElementById(tid)?.focus();
  }, [tid]);
  // outside click: just close, the user's click decides focus
  const dismiss = useCallback(() => setOpen(false), []);
  useDismiss(open, dismiss, ref, close);
  useFocusFirst(open, panel);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        id={tid}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-16 w-full items-center gap-3 rounded-xl bg-surface px-4 text-left transition-colors ${
          emphasis || open ? "border-[1.5px] border-brand" : "border border-line hover:border-line-strong"
        }`}
      >
        <Icon name={icon} className="shrink-0 text-ink-2" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="t-cap text-ink-3">{label}</span>
          <span className="truncate t-body-mm text-ink">{value}</span>
        </span>
        <Icon name="chevronDown" className={`shrink-0 text-ink-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden onClick={close} />
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-label={label}
            style={{ ["--pw" as string]: `${panelWidth}px` }}
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-3 shadow-03 sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:w-[var(--pw)] sm:rounded-2xl ${
              align === "right" ? "sm:right-0" : "sm:left-0"
            }`}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden" />
            {children(close)}
          </div>
        </>
      )}
    </div>
  );
}

/* Option list inside a popover */
export function OptionList<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ul role="listbox" className="flex flex-col">
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <li key={String(o.value)}>
            <button
              type="button"
              role="option"
              aria-selected={sel}
              onClick={() => onChange(o.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors ${sel ? "bg-brand-subtle" : "hover:bg-surface-subtle"}`}
            >
              <span className={`t-body-sm ${sel ? "text-brand-subtle-text" : "text-ink"}`}>{o.label}</span>
              <span className="flex items-center gap-2">
                {o.hint && <span className="t-cap text-ink-3">{o.hint}</span>}
                {sel && <Icon name="check" size={18} className="text-brand" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* Month calendar — Figma "Calendar day" (Free / Few / Busy / Selected).
   Real dates; past days and days beyond the booking window are disabled.
   `status` may return undefined while availability is loading. */
export function MonthCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  status,
  note,
  today,
  size = "md",
}: {
  month: string; // YYYY-MM
  onMonth: (ym: string) => void;
  selected: string | null;
  onSelect: (iso: string) => void;
  status: (iso: string) => Status | undefined;
  note?: (iso: string) => string | undefined;
  today: string;
  size?: "md" | "lg";
}) {
  const dates = monthDates(month);
  const lead = weekdayIdx(dates[0]);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  const h = size === "lg" ? "h-12 sm:h-14" : "h-12";
  const minMonth = monthOf(addDays(today, BOOKING_MIN_DAYS));
  const maxMonth = monthOf(addDays(today, BOOKING_MAX_DAYS));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="t-body-sb">{monthLabel(month)}</span>
        <div className="flex gap-2">
          {(
            [
              ["chevronLeft", -1, "Oldingi oy", month <= minMonth],
              ["chevronRight", 1, "Keyingi oy", month >= maxMonth],
            ] as const
          ).map(([n, d, label, dis]) => (
            <button key={n} type="button" aria-label={label} disabled={dis} onClick={() => onMonth(addMonths(month, d))} className="grid size-9 place-items-center rounded-full border border-line bg-surface transition-colors hover:bg-surface-subtle disabled:opacity-40 disabled:hover:bg-surface">
              <Icon name={n} size={18} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WD_SHORT.map((w) => (
          <span key={w} className="text-center t-cap-m text-ink-3">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((iso, i) => {
          if (iso === null) return <span key={`e${i}`} />;
          const d = dayNum(iso);
          const bookable = isBookable(iso, today);
          const s = bookable ? status(iso) : "busy";
          const sel = iso === selected;
          const n = bookable ? note?.(iso) : undefined;
          const base = `flex ${h} flex-col items-center justify-center rounded-lg transition-colors`;
          if (s === undefined)
            return <span key={iso} className={`${base} animate-pulse bg-surface-subtle text-[14px] leading-[18px] font-medium text-ink-3`}>{d}</span>;
          if (s === "busy" && !sel)
            return (
              <span key={iso} aria-disabled className={`${base} bg-surface-subtle text-[14px] leading-[18px] font-medium text-ink-3 ${bookable ? "line-through" : "opacity-60"}`}>
                {d}
              </span>
            );
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={sel}
              aria-label={`${dayLabel(iso)}${s === "few" ? ", 1 joy qoldi" : ""}`}
              onClick={() => onSelect(iso)}
              className={`${base} ${
                sel
                  ? "bg-brand text-white"
                  : s === "few"
                    ? "bg-accent-subtle text-ink hover:ring-1 hover:ring-accent"
                    : "border border-line bg-surface text-ink hover:border-brand"
              }`}
            >
              <span className={`text-[14px] leading-[18px] ${sel ? "font-semibold" : "font-medium"}`}>{d}</span>
              {(n || s === "few") && (
                <span className={`text-[11px] leading-[14px] ${sel ? "text-white/80" : s === "few" ? "text-accent-subtle-text" : "text-brand"}`}>
                  {n ?? "1 joy"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Segmented — Figma 238:119 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex h-11 items-center justify-center rounded-full px-6 t-body-sb transition-colors ${
            o.value === value ? "bg-brand text-white" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* Chip — Figma 148:39 (Md 44) */
export function Chip({ selected, onClick, children }: { selected?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-11 shrink-0 items-center justify-center gap-1 rounded-full px-4 text-[14px] leading-[18px] font-medium transition-colors ${
        selected ? "bg-brand text-white" : "border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
