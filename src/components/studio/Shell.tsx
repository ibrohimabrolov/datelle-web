"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useDataVersion } from "./data";
import { StudioIcon, type StudioIconName } from "./icons";
import { PANEL, usePanel, useStudio, type Role } from "./PanelProvider";

type NavDef = { href: string; label: string; icon: StudioIconName; roles: Role[] };

/* Order follows Figma Sidebar (desktop) and TabBar (mobile). Dashboard is owner-only (MVP-SCOPE). */
const NAV: NavDef[] = [
  { href: `${PANEL}/dashboard`, label: "Dashboard", icon: "chart-column", roles: ["owner"] },
  { href: `${PANEL}/kalendar`, label: "Kalendar", icon: "calendar", roles: ["owner", "manager"] },
  { href: `${PANEL}/buyurtmalar`, label: "Buyurtmalar", icon: "clipboard-text", roles: ["owner", "manager"] },
];
const SETTINGS: NavDef = { href: `${PANEL}/sozlamalar`, label: "Sozlamalar", icon: "gear", roles: ["owner", "manager"] };
/* Mobile tab order puts the daily tool first */
const TAB_ORDER = ["kalendar", "buyurtmalar", "dashboard"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const ctx = useStudio();
  const { tg } = usePanel();
  const router = useRouter();
  // Telegram ⋯ menu → Sozlamalar (MVP-SCOPE: settings top-right on mobile; Telegram owns that corner)
  useEffect(() => {
    const sb = tg?.SettingsButton;
    if (!sb) return;
    const go = () => router.push(SETTINGS.href);
    sb.show();
    sb.onClick(go);
    return () => {
      sb.offClick(go);
      sb.hide();
    };
  }, [tg, router]);
  const studio = ctx?.studio;
  const items = studio ? NAV.filter((n) => n.roles.includes(studio.role)) : [];
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  // nav badge: orders that still owe money (refreshes whenever money or orders change)
  const version = useDataVersion();
  const [debt, setDebt] = useState<number | null>(null);
  useEffect(() => {
    if (!studio?.id) return;
    let alive = true;
    api<{ counts: { debt: number } }>("/api/panel/summary")
      .then((r) => alive && setDebt(r.counts.debt))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [studio?.id, version]);
  const tabs = [...items].sort((a, b) => TAB_ORDER.indexOf(a.href.split("/").pop()!) - TAB_ORDER.indexOf(b.href.split("/").pop()!));

  return (
    <div className="ds-shell">
      <aside className="ds-sidebar" aria-label="Asosiy menyu">
        <div>
          <div className="ds-brandline">
            <span className="ds-mark" aria-hidden>
              D
            </span>
            <div>
              <span className="ds-body-strong">Datelle</span>
              <small>Studio</small>
            </div>
          </div>
          <p className="ds-caps ds-navlabel">Studiya</p>
          <nav className="ds-nav" aria-busy={!studio || undefined}>
            {studio
              ? [...items, SETTINGS].map((n) => <NavItem key={n.href} item={n} current={active(n.href)} count={n.href.endsWith("/buyurtmalar") ? debt : null} />)
              : [0, 1, 2, 3].map((i) => <span key={i} className="ds-skeleton" style={{ height: 40, borderRadius: "var(--ds-radius-md)" }} />)}
          </nav>
        </div>
        {studio ? (
          <Link href={SETTINGS.href} className="ds-studiocard">
            <span className="ds-avatar" aria-hidden>
              {initials(studio.name)}
            </span>
            <div>
              <strong>{studio.name}</strong>
              <span className="ds-label ds-secondary">{studio.role === "owner" ? "Asoschi hamkor" : "Menejer"}</span>
            </div>
          </Link>
        ) : (
          <span className="ds-skeleton" style={{ height: 64, borderRadius: "var(--ds-radius-md)" }} />
        )}
      </aside>

      <main className="ds-main" id="main">
        <div className="ds-main-inner">{children}</div>
      </main>

      {studio && <nav className="ds-tabbar" aria-label="Asosiy menyu">
        {tabs.map((n) => {
          const on = active(n.href);
          return (
            <Link key={n.href} href={n.href} className="ds-tab" aria-current={on ? "page" : undefined} aria-label={n.label}>
              <StudioIcon name={n.icon} variant={on ? "Filled" : "Line"} />
              <span aria-hidden>{n.label}</span>
            </Link>
          );
        })}
      </nav>}
    </div>
  );
}

function NavItem({ item, current, count }: { item: NavDef; current: boolean; count?: number | null }) {
  return (
    <Link href={item.href} className="ds-navitem" aria-current={current ? "page" : undefined}>
      <StudioIcon name={item.icon} variant={current ? "Filled" : "Line"} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {count ? (
        <span className="ds-navcount" aria-label={`${count} ta qoldiq`}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/* Page header: H1 + actions. Settings lives in the header on mobile (MVP-SCOPE navigation). */
/* Mobile settings shortcut for the browser (inside Telegram the ⋯ menu has it) */
export function SettingsLink() {
  return (
    <Link href={SETTINGS.href} className="ds-iconbtn ds-mobile-only" data-style="secondary" aria-label="Sozlamalar">
      <StudioIcon name="gear" />
    </Link>
  );
}

export function PageHead({ title, actions, settings = true }: { title: string; actions?: ReactNode; settings?: boolean }) {
  return (
    <header className="ds-page-head">
      <h1 className="ds-h1">{title}</h1>
      <div style={{ display: "flex", gap: "var(--ds-space-8)" }}>
        {actions}
        {settings && (
          <Link href={SETTINGS.href} className="ds-iconbtn ds-mobile-only" aria-label="Sozlamalar">
            <StudioIcon name="gear" />
          </Link>
        )}
      </div>
    </header>
  );
}
