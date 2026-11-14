"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { telegram, type TelegramWebApp } from "./telegram";

export type Role = "owner" | "manager";
export type Studio = { id: string; name: string; category: "dekor" | "floristika"; dailyCapacity: number; role: Role };
export type Me = { user: { id: string; name: string; username: string | null; photoUrl: string | null }; studios: Studio[] };

type State =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "error"; message: string }
  | { status: "ready"; me: Me; studio: Studio | null };

type Ctx = {
  state: State;
  tg: TelegramWebApp | null;
  startParam: string | null;
  setMe(me: Me): void;
  signOut(): Promise<void>;
  retry(): void;
};

const PanelCtx = createContext<Ctx | null>(null);
export const usePanel = () => {
  const c = useContext(PanelCtx);
  if (!c) throw new Error("usePanel outside PanelProvider");
  return c;
};
/* Signed in with a studio — or null while auth resolves / a redirect is in flight (render a skeleton) */
export const useStudio = () => {
  const { state } = usePanel();
  return state.status === "ready" && state.studio ? { me: state.me, studio: state.studio } : null;
};

export const PANEL = "/panel";
export const homeFor = (role: Role) => (role === "owner" ? `${PANEL}/dashboard` : `${PANEL}/kalendar`);
const PUBLIC = [`${PANEL}/kirish`];
const ONBOARDING = `${PANEL}/onboarding`;

/* Where should this state be? null = stay */
function routeFor(state: State, path: string): string | null {
  if (state.status === "anon") return PUBLIC.includes(path) ? null : `${PANEL}/kirish`;
  if (state.status !== "ready") return null;
  if (!state.studio) return path === ONBOARDING ? null : ONBOARDING;
  if (path === PANEL || PUBLIC.includes(path) || path === ONBOARDING) return homeFor(state.studio.role);
  if (path.startsWith(`${PANEL}/dashboard`) && state.studio.role !== "owner") return `${PANEL}/kalendar`;
  return null;
}

export function PanelProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<State>({ status: "loading" });
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const setMe = useCallback((me: Me) => setState({ status: "ready", me, studio: me.studios[0] ?? null }), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const wa = await telegram();
      if (!alive) return;
      setTg(wa);
      try {
        if (wa) {
          // Mini App: sign in on every open from signed initData — never trust the webview cookie jar
          const r = await api<Me & { startParam: string | null }>("/api/panel/auth/telegram", { body: { initData: wa.initData } });
          if (!alive) return;
          setStartParam(r.startParam);
          setMe(r);
        } else {
          setMe(await api<Me>("/api/panel/me"));
        }
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401 && !wa) setState({ status: "anon" });
        else setState({ status: "error", message: e instanceof ApiError ? e.message : "Xatolik yuz berdi" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt, setMe]);

  // Telegram theme → data-theme; platform flag switches surfaces to themeParams (tokens.css)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".studio");
    if (!el || !tg) return;
    el.dataset.platform = "telegram";
    const apply = () => (el.dataset.theme = tg.colorScheme);
    apply();
    tg.onEvent("themeChanged", apply);
    return () => tg.offEvent("themeChanged", apply);
  }, [tg]);

  // Exposed for E2E and support debugging: <div class="studio" data-session="loading|anon|ready|error">
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".studio");
    if (el) el.dataset.session = state.status;
  }, [state.status]);

  const target = routeFor(state, path);
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  const signOut = useCallback(async () => {
    await api("/api/panel/auth/logout", { body: {} }).catch(() => undefined);
    setState({ status: "anon" });
  }, []);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => ({ state, tg, startParam, setMe, signOut, retry }), [state, tg, startParam, setMe, signOut, retry]);

  // Segments always render (instant navigation stays valid); screens show skeletons until useStudio() is ready
  return <PanelCtx.Provider value={value}>{state.status === "error" ? <ErrorScreen message={state.message} onRetry={retry} /> : children}</PanelCtx.Provider>;
}

export function Splash() {
  return (
    <div className="ds-center" role="status" aria-live="polite">
      <div className="ds-state">
        <span className="ds-mark" data-size="lg" aria-hidden>
          D
        </span>
        <span className="ds-sr-only">Yuklanmoqda</span>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div className="ds-center">
      <div className="ds-state" role="alert">
        <span className="ds-mark" data-size="lg" aria-hidden>
          D
        </span>
        <h1 className="ds-h2">Kirib boʻlmadi</h1>
        <p className="ds-body ds-secondary">{message}</p>
        <button className="ds-btn" data-style="primary" onClick={onRetry}>
          Qayta urinish
        </button>
      </div>
    </div>
  );
}
