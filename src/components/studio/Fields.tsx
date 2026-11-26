"use client";

import { useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { dayLabel, dayShort, todayISO } from "@/lib/dates";
import { groupThousands, parseMoney } from "@/lib/studio/orders";

/* Figma Input: label 13/18 · field 48 · helper/error 13/18. Wires label, error and aria for every field. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (a: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="ds-field">
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? msgId : undefined })}
      {error ? (
        <p id={msgId} className="ds-helper" data-error>
          {error}
        </p>
      ) : hint ? (
        <div id={msgId} className="ds-helper">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

type Base = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

/* Money: digits only, grouped "9 000 000", value is an integer (or null when empty) */
export function MoneyInput({ value, onChange, ...rest }: Base & { value: number | null; onChange(v: number | null): void }) {
  return (
    <div className="ds-affix">
      <input
        {...rest}
        className="ds-input"
        inputMode="numeric"
        autoComplete="off"
        value={value == null ? "" : groupThousands(value)}
        onChange={(e) => onChange(parseMoney(e.target.value.replace(/[^\d\s]/g, "")))}
      />
      <span aria-hidden>soʻm</span>
    </div>
  );
}

/* Uzbek mobile: shows "+998 97 214 60 05" while typing; the server normalises and validates */
export const formatPhone = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.length ? `+998 ${parts.join(" ")}` : "";
};
export function PhoneInput({ value, onChange, ...rest }: Base & { value: string; onChange(v: string): void }) {
  return (
    <input
      {...rest}
      className="ds-input"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+998 90 123 45 67"
      value={value}
      onChange={(e) => onChange(formatPhone(e.target.value))}
    />
  );
}

/* Figma Input with a date: the field reads "13-may, chorshanba" (today: "Bugun, 12-may") instead of the
   browser's own format (mm/dd/yyyy in an en-US Chrome). A native date input sits on top, transparent, so the
   system picker, keyboard entry and the label/aria wiring all stay native. */
export const dateText = (iso: string, today = todayISO()) => (iso === today ? `Bugun, ${dayShort(iso)}` : dayLabel(iso));
export function DateInput({ value, onChange, ...rest }: Base & { value: string; onChange(v: string): void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="ds-datefield">
      <input
        {...rest}
        ref={ref}
        className="ds-input"
        type="date"
        value={value}
        onClick={() => {
          try {
            ref.current?.showPicker?.();
          } catch {
            /* not allowed (e.g. cross-origin iframe) — the native control still works */
          }
        }}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <span className="ds-datefield-text" aria-hidden>
        {value ? dateText(value) : ""}
      </span>
    </div>
  );
}
