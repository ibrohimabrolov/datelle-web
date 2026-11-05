"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api, ApiError, invalidate, useApi } from "@/lib/api";
import { LogoMark } from "@/components/ui/Logo";
import { TextField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

const NAV = [
  { href: "/admin", label: "Umumiy" },
  { href: "/admin/sorovlar", label: "Soʻrovlar" },
  { href: "/admin/studiyalar", label: "Studiyalar" },
  { href: "/admin/arizalar", label: "Hamkor arizalari" },
  { href: "/admin/lidlar", label: "Lidlar" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const me = useApi<{ admin: true }>("/api/admin/me");
  const pathname = usePathname();

  if (!me.data && !me.error) return <ShellSkeleton />;
  if (me.error?.code === "admin_disabled") return <Centered title="Admin panel yoqilmagan">Vercel sozlamalarida <code className="rounded bg-surface-subtle px-1.5 py-0.5">ADMIN_PASSWORD</code> qoʻshing va qayta deploy qiling.</Centered>;
  if (me.error?.status === 401) return <Login onDone={me.reload} />;
  if (me.error) return <Centered title="Server bilan aloqa yoʻq">{me.error.message}</Centered>;

  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <div className="min-h-dvh bg-bg-primary lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 z-10 border-b border-line bg-surface lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:h-16 lg:px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="t-body-sb text-ink">Datelle Admin</span>
          </Link>
          <Logout className="lg:hidden" onDone={me.reload} />
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:px-3 lg:pt-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`flex h-9 shrink-0 items-center rounded-md px-3 t-body-sm whitespace-nowrap transition-colors ${
                active(n.href) ? "bg-brand-subtle text-brand-subtle-text" : "text-ink-2 hover:bg-surface-subtle hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-4 hidden flex-col gap-1 lg:flex">
          <Link href="/" className="flex h-9 items-center rounded-md px-3 t-body-sm text-ink-2 hover:bg-surface-subtle hover:text-ink">
            Saytni ochish ↗
          </Link>
          <Logout onDone={me.reload} />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

function Logout({ className = "", onDone }: { className?: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api("/api/admin/logout", { body: {} }).catch(() => {});
        invalidate("/api/admin");
        setBusy(false);
        onDone();
      }}
      className={`flex h-9 items-center rounded-md px-3 t-body-sm text-ink-2 hover:bg-surface-subtle hover:text-ink ${className}`}
    >
      Chiqish
    </button>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <Centered title="Admin panel" sub="Davom etish uchun parolni kiriting">
      <form
        className="mt-6 flex flex-col gap-4 text-left"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(undefined);
          try {
            await api("/api/admin/login", { body: { password } });
            onDone();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
            setBusy(false);
          }
        }}
      >
        <TextField label="Parol" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        <Button type="submit" disabled={busy || !password} className="w-full">
          {busy ? "Tekshirilmoqda…" : "Kirish"}
        </Button>
      </form>
    </Centered>
  );
}

function Centered({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg-primary px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-02)]">
        <LogoMark size={40} className="mx-auto" />
        <h1 className="mt-5 t-title text-ink">{title}</h1>
        {sub && <p className="mt-1 t-body-s text-ink-2">{sub}</p>}
        {children && !sub ? <div className="mt-3 t-body-s text-ink-2">{children}</div> : children}
      </div>
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="min-h-dvh bg-bg-primary lg:grid lg:grid-cols-[240px_1fr]" aria-busy="true">
      <div className="h-14 border-b border-line bg-surface lg:h-dvh lg:border-r lg:border-b-0" />
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="h-8 w-48 animate-pulse rounded-md bg-surface-subtle" />
      </div>
    </div>
  );
}
