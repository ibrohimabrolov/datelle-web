"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

/* Input — Figma 149:40 (label 14/18 medium · field h52 r12) */
export function TextField({
  label,
  error,
  className = "",
  ...rest
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[14px] leading-[18px] font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-e` : undefined}
        className={`h-[52px] w-full rounded-lg border bg-surface px-4 t-body-m text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-[1.5px] focus:border-brand ${
          error ? "border-error" : "border-line"
        }`}
        {...rest}
      />
      {error && (
        <span id={`${id}-e`} className="t-cap text-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function TextArea({ label, className = "", ...rest }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[14px] leading-[18px] font-medium text-ink-2">
        {label}
      </label>
      <textarea
        id={id}
        className="min-h-[104px] w-full resize-y rounded-lg border border-line bg-surface px-4 py-3.5 t-body-m text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-[1.5px] focus:border-brand"
        {...rest}
      />
    </div>
  );
}

/* +998 XX XXX XX XX */
export function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return "+998" + (parts.length ? " " + parts.join(" ") : " ");
}
export const phoneDigits = (v: string) => v.replace(/\D/g, "").replace(/^998/, "");
export const isPhoneValid = (v: string) => phoneDigits(v).length === 9;

export function PhoneField({
  value,
  onChange,
  error,
  label = "Telefon",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  className?: string;
}) {
  return (
    <TextField
      label={label}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+998 __ ___ __ __"
      value={value}
      onFocus={() => !value && onChange("+998 ")}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      error={error}
      className={className}
    />
  );
}
