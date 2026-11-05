"use client";

import { useState, type ReactNode } from "react";
import { api, ApiError, invalidate } from "@/lib/api";

/* Small building blocks for the admin panel (theme-app tokens) */

export function PageHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="t-h3 text-ink">{title}</h1>
        {sub && <p className="mt-1 t-body-s text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>;
}

export type Tone = "brand" | "warning" | "neutral" | "error" | "success" | "info";
const TONES: Record<Tone, string> = {
  brand: "bg-brand-subtle text-brand-subtle-text",
  warning: "bg-warning-subtle text-warning-subtle-text",
  neutral: "bg-surface-subtle text-[color:var(--neutral-subtle-text)]",
  error: "bg-error-subtle text-error-subtle-text",
  success: "bg-success-subtle text-success-subtle-text",
  info: "bg-info-subtle text-info-subtle-text",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center rounded-md px-2 t-cap-m whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" className="inline-flex gap-1 rounded-lg bg-surface-subtle p-1">
        {options.map((o) => (
          <button
            key={o.value}
            role="tab"
            aria-selected={value === o.value}
            onClick={() => onChange(o.value)}
            className={`h-8 rounded-md px-3 t-body-sm whitespace-nowrap transition-colors ${value === o.value ? "bg-surface text-ink shadow-[var(--shadow-01)]" : "text-ink-2 hover:text-ink"}`}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 text-ink-3">{o.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center t-body-s text-ink-2">{children}</div>;
}

export function ErrorNote({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-error-subtle px-4 py-3 t-body-s text-error-subtle-text">
      <span>{error.message}</span>
      {onRetry && (
        <button onClick={onRetry} className="t-body-sb underline underline-offset-2">
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function Rows({ n = 4 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Yuklanmoqda">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-xl bg-surface-subtle" />
      ))}
    </div>
  );
}

const btn = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-subtle",
  danger: "border border-line-strong bg-surface text-error hover:bg-error-subtle",
  ghost: "text-ink-2 hover:bg-surface-subtle hover:text-ink",
};
export function SmallButton({
  variant = "secondary",
  className = "",
  ...p
}: { variant?: keyof typeof btn } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 t-body-sb whitespace-nowrap transition-colors disabled:opacity-40 ${btn[variant]} ${className}`}
    />
  );
}

/* POST to an admin endpoint, then drop cached admin GETs so lists refetch fresh */
export function useMutation() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(key: string, url: string, body: unknown, after?: () => void) {
    setBusy(key);
    setError(null);
    try {
      await api(url, { body });
      invalidate("/api/admin");
      after?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Xatolik yuz berdi");
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, run, clearError: () => setError(null) };
}

export const tel = (phone: string) => `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`;
