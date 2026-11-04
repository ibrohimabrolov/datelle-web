"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { MONTH, WD_SHORT, weekdayIdx, type Status } from "@/data/catalog";

/* ── Popover: anchored on ≥sm, bottom sheet on mobile ── */
export function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
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
  const id = useId();
  const close = () => setOpen(false);
  useDismiss(open, close, ref);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
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
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden />
          <div
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

/* Month calendar — Figma "Calendar day" (Free / Few / Busy / Selected) */
export function MonthCalendar({
  selected,
  onSelect,
  status,
  note,
  size = "md",
}: {
  selected: number;
  onSelect: (d: number) => void;
  status: (d: number) => Status;
  note?: (d: number) => string | undefined;
  size?: "md" | "lg";
}) {
  const lead = weekdayIdx(1);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: MONTH.days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const h = size === "lg" ? "h-12 sm:h-14" : "h-12";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WD_SHORT.map((w) => (
          <span key={w} className="text-center t-cap-m text-ink-3">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const s = status(d);
          const sel = d === selected;
          const n = note?.(d);
          const base = `flex ${h} flex-col items-center justify-center rounded-lg transition-colors`;
          if (s === "busy" && !sel)
            return (
              <span key={d} aria-disabled className={`${base} bg-surface-subtle text-[14px] leading-[18px] font-medium text-ink-3 line-through`}>
                {d}
              </span>
            );
          return (
            <button
              key={d}
              type="button"
              aria-pressed={sel}
              aria-label={`${d}-iyun${s === "few" ? ", 1 joy qoldi" : ""}`}
              onClick={() => onSelect(d)}
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
