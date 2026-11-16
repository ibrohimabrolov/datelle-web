"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, apiDefaults, ApiError } from "@/lib/api";
import { dataChanged } from "./data";
import { telegram, type TelegramWebApp } from "./telegram";

export type Role = "owner" | "manager";
export type Studio = { id: string; name: string; category: "dekor" | "floristika"; dailyCapacity: number; role: Role; remindersOn: boolean };
export type Me = {
  user: { id: string; name: string; username: string | null; photoUrl: string | null };
  studios: Studio[];
  /* set when the person has no studio because an owner removed them (last 30 days) */
  removed?: { studio: string; by: { name: string; username: string | null } | null } | null;
};

type State =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "error"; message: string }
  | { status: "ready"; me: Me; studio: Studio | null };

type Ctx = {
  state: State;
  tg: TelegramWebApp | null;
  startParam: string | null;
  /* pending invite token (Mini App start_param inv_…, ?taklif= from the bot, or /panel/taklif?t=) */
  invite: string | null;
  clearInvite(): void;
  setMe(me: Me, studioId?: string): void;
  switchStudio(id: string): void;
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
export const INVITE_PATH = `${PANEL}/taklif`;
export const REMOVED_PATH = `${PANEL}/yopilgan`;
const STUDIO_KEY = "ds-studio";
const INVITE_KEY = "ds-invite";
/* last accepted/declined token: Telegram keeps start_param (and the URL keeps ?taklif=) for the whole session,
   so a reload must not resurrect an invite the person already answered */
const INVITE_DONE_KEY = "ds-invite-done";
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* private mode / storage blocked — the session still works, just without memory */
    }
  },
};

/* Where should this state be? null = stay */
function routeFor(state: State, path: string, invite: string | null): string | null {
  if (state.status === "anon") return PUBLIC.includes(path) ? null : `${PANEL}/kirish`;
  if (state.status !== "ready") return null;
  // an invite beats onboarding and home: the person came to join a studio
  if (invite) return path === INVITE_PATH ? null : INVITE_PATH;
  if (path === INVITE_PATH) return state.studio ? homeFor(state.studio.role) : ONBOARDING;
  // removed from their only studio: explain first; "Oʻz studiyamni ochish" still reaches onboarding
  if (!state.studio && state.me.removed) return path === REMOVED_PATH || path === ONBOARDING ? null : REMOVED_PATH;
  if (!state.studio) return path === ONBOARDING ? null : ONBOARDING;
  if (path === REMOVED_PATH) return homeFor(state.studio.role);
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

  const [invite, setInvite] = useState<string | null>(null);

  const setMe = useCallback((me: Me, studioId?: string) => {
    const wanted = studioId ?? store.get(STUDIO_KEY);
    const studio = me.studios.find((s) => s.id === wanted) ?? me.studios[0] ?? null;
    // every API call targets the active studio (server falls back to the first membership without it)
    if (studio) apiDefaults["x-studio-id"] = studio.id;
    else delete apiDefaults["x-studio-id"];
    store.set(STUDIO_KEY, studio?.id ?? null);
    setState({ status: "ready", me, studio });
  }, []);
  const meRef = useRef<Me | null>(null);
  useEffect(() => {
    meRef.current = state.status === "ready" ? state.me : null;
  }, [state]);
  const switchStudio = useCallback(
    (id: string) => {
      if (!meRef.current) return;
      setMe(meRef.current, id);
      dataChanged(); // every screen refetches for the new studio
    },
    [setMe],
  );
  const clearInvite = useCallback(() => {
    const t = store.get(INVITE_KEY);
    if (t) store.set(INVITE_DONE_KEY, t);
    store.set(INVITE_KEY, null);
    setInvite(null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // invite from the URL (bot /start inv_… → ?taklif=, web link → /panel/taklif?t=), kept across the login step
      const q = new URLSearchParams(location.search);
      const fromUrl = q.get("taklif") ?? (location.pathname === INVITE_PATH ? q.get("t") : null);
      const fresh = (t: string | null | undefined): t is string => !!t && /^[A-Za-z0-9_-]{16,64}$/.test(t) && t !== store.get(INVITE_DONE_KEY);
      if (fresh(fromUrl)) store.set(INVITE_KEY, fromUrl);
      const pending = store.get(INVITE_KEY);
      if (pending) setInvite(pending);
      const wa = await telegram();
      if (!alive) return;
      setTg(wa);
      try {
        if (wa) {
          // Mini App: sign in on every open from signed initData — never trust the webview cookie jar
          const r = await api<Me & { startParam: string | null }>("/api/panel/auth/telegram", { body: { initData: wa.initData } });
          if (!alive) return;
          setStartParam(r.startParam);
          const fromStart = r.startParam?.startsWith("inv_") ? r.startParam.slice(4) : null;
          if (fresh(fromStart)) {
            store.set(INVITE_KEY, fromStart);
            setInvite(fromStart);
          }
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

  const target = routeFor(state, path, invite);
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

  const value = useMemo(
    () => ({ state, tg, startParam, invite, clearInvite, setMe, switchStudio, signOut, retry }),
    [state, tg, startParam, invite, clearInvite, setMe, switchStudio, signOut, retry],
  );

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
