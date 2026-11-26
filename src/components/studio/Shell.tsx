"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useDataVersion } from "./data";
import { StudioIcon, type StudioIconName } from "./icons";
import { FakeDoor } from "./FakeDoor";
import { PANEL, usePanel, useStudio, type Role } from "./PanelProvider";
import { Toast, type ToastMsg } from "./Toast";
import { TrialEndedGate } from "./TrialEnded";
import { LogoMark } from "@/components/ui/Logo";

type NavDef = { href: string; label: string; icon: StudioIconName; roles: Role[] };

/* Order follows Figma Sidebar (desktop) and TabBar (mobile). Dashboard is owner-only (MVP-SCOPE). */
const NAV: NavDef[] = [
  { href: `${PANEL}/dashboard`, label: "Dashboard", icon: "chart-column", roles: ["owner"] },
  { href: `${PANEL}/kalendar`, label: "Kalendar", icon: "calendar", roles: ["owner", "manager"] },
  { href: `${PANEL}/buyurtmalar`, label: "Buyurtmalar", icon: "clipboard-text", roles: ["owner", "manager"] },
  /* Figma draws these under "Tez orada"; they are live now, so they sit with the working pages. Xarajatlar is owner only, like Dashboard. */
  { href: `${PANEL}/rekvizit`, label: "Rekvizit", icon: "box", roles: ["owner", "manager"] },
  { href: `${PANEL}/xarajatlar`, label: "Xarajatlar", icon: "receipt", roles: ["owner"] },
];
const SETTINGS: NavDef = { href: `${PANEL}/sozlamalar`, label: "Sozlamalar", icon: "gear", roles: ["owner", "manager"] };
/* Mobile tab order puts the daily tool first; Xarajatlar is desktop-only for now (no mobile design yet) */
const TAB_ORDER = ["kalendar", "buyurtmalar", "dashboard"];

/* Figma Sidebar · "Tez orada" (NavItem State=soon / soon-voted) + 07 · Tez orada (fake door dialog).
   Desktop only — the mobile TabBar has no room for them. */
type Soon = { feature: "jamoa-jadvali"; label: string; icon: StudioIconName; title: string; text: string };
const SOON: Soon[] = [
  { feature: "jamoa-jadvali", label: "Jamoa jadvali", icon: "users", title: "Jamoa jadvali", text: "Kim qaysi tadbirda ishlashini taqsimlang — har bir xodim oʻz vazifasini botda koʻradi. Sizga kerakmi?" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  // Desktop scrolls inside the content card (the page doesn't), so a new page must start at its top
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [path]);
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
  const tabs = items.filter((n) => TAB_ORDER.includes(n.href.split("/").pop()!)).sort((a, b) => TAB_ORDER.indexOf(a.href.split("/").pop()!) - TAB_ORDER.indexOf(b.href.split("/").pop()!));

  // "Tez orada" votes of this member in this studio (server-side, so they survive devices)
  const [voted, setVoted] = useState<Soon["feature"][]>([]);
  const [door, setDoor] = useState<Soon | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  useEffect(() => {
    if (!studio?.id) return;
    let alive = true;
    api<{ features: Soon["feature"][] }>("/api/panel/interest")
      .then((r) => alive && setVoted(r.features))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [studio?.id]);

  return (
    <div className="ds-shell">
      <aside className="ds-sidebar" aria-label="Asosiy menyu">
        <div className="ds-sidebar-top">
          <div className="ds-brandline">
            <LogoMark size={28} />
            <span className="ds-body-strong">Floreal</span>
          </div>
          <div className="ds-navgroup">
            <p className="ds-label ds-navlabel">Studiya</p>
            <nav className="ds-nav" aria-busy={!studio || undefined}>
              {studio
                ? [...items, SETTINGS].map((n) => <NavItem key={n.href} item={n} current={active(n.href)} count={n.href.endsWith("/buyurtmalar") ? debt : null} />)
                : [0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="ds-skeleton" data-on="brand" style={{ height: 40, borderRadius: "var(--ds-radius-md)" }} />)}
            </nav>
          </div>
          {studio && (
            <div className="ds-navgroup">
              <p className="ds-label ds-navlabel" id="soon-label">
                Tez orada
              </p>
              <ul className="ds-nav" aria-labelledby="soon-label">
                {SOON.map((s) => {
                  const on = voted.includes(s.feature);
                  return (
                    <li key={s.feature}>
                      <button
                        type="button"
                        className="ds-navitem"
                        data-soon={on ? "voted" : ""}
                        onClick={() => setDoor(s)}
                        aria-haspopup="dialog"
                        aria-label={on ? `${s.label} — soʻrovingiz qabul qilingan` : `${s.label} — tez orada`}
                      >
                        <StudioIcon name={s.icon} variant="Filled" />
                        <span style={{ flex: 1 }}>{s.label}</span>
                        {on && <StudioIcon name="check" className="ds-navcheck" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {studio ? (
          <Link href={SETTINGS.href} className="ds-studiocard">
            {/* Figma DataDisplay/Avatar Type=studio — default 3D bouquet until logo upload exists */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static 80px WebP (1.5 KB); next/image adds nothing here */}
            <img className="ds-avatar" src="/studio/3d/guldasta.webp" alt="" width={40} height={40} />
            <div>
              <strong>{studio.name}</strong>
              <span className="ds-label ds-tertiary">{studio.role === "owner" ? "Egasi" : "Menejer"}</span>
            </div>
          </Link>
        ) : (
          <span className="ds-skeleton" data-on="brand" style={{ height: 64, borderRadius: "var(--ds-radius-md)" }} />
        )}
      </aside>

      {door && (
        <FakeDoor
          title={door.title}
          text={door.text}
          voted={voted.includes(door.feature)}
          onClose={() => setDoor(null)}
          onVote={async () => {
            const r = await api<{ features: Soon["feature"][] }>("/api/panel/interest", { body: { feature: door.feature } });
            setVoted(r.features);
            setDoor(null);
            setToast({ id: Date.now(), text: "Rahmat — tayyor boʻlganda xabar beramiz" });
          }}
        />
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
      <TrialEndedGate />

      <main className="ds-main" id="main" ref={mainRef}>
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
      {/* Figma Sidebar: Filled icons in every state (white on brand, default on the active pill) */}
      <StudioIcon name={item.icon} variant="Filled" />
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
