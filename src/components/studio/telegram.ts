"use client";

/* Thin, typed bridge to Telegram.WebApp. The SDK script is loaded only inside Telegram
   (detected from launch params), so the desktop web never pays for it. */

type BottomButton = {
  setParams(p: { text?: string; is_active?: boolean; is_visible?: boolean; has_shine_effect?: boolean }): void;
  show(): void;
  hide(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { start_param?: string };
  colorScheme: "light" | "dark";
  platform: string;
  version: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(v: string): boolean;
  disableVerticalSwipes?(): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  onEvent(e: "themeChanged", cb: () => void): void;
  offEvent(e: "themeChanged", cb: () => void): void;
  MainButton: BottomButton;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  /* "Sozlamalar" item in the Mini App ⋯ menu (Bot API 7.0+) */
  SettingsButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: { notificationOccurred(t: "error" | "success" | "warning"): void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp; Login?: { auth(o: { bot_id: number; request_access?: "write" }, cb: (user: Record<string, unknown> | false) => void): void } };
    TelegramWebviewProxy?: unknown;
  }
}

const SDK = "https://telegram.org/js/telegram-web-app.js?59";

/* Telegram passes tgWebAppData in the URL hash on launch; the SDK keeps it in sessionStorage after navigation */
export function launchedInTelegram() {
  if (typeof window === "undefined") return false;
  if (window.Telegram?.WebApp?.initData) return true;
  if (location.hash.includes("tgWebAppData")) return true;
  try {
    return Boolean(sessionStorage.getItem("__telegram__initParams"));
  } catch {
    return false;
  }
}

let loading: Promise<TelegramWebApp | null> | null = null;

export function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`script ${src}`));
    document.head.appendChild(s);
  });
}

export function telegram(): Promise<TelegramWebApp | null> {
  if (!launchedInTelegram()) return Promise.resolve(null);
  loading ??= loadScript(SDK)
    .then(() => {
      const wa = window.Telegram?.WebApp;
      if (!wa?.initData) return null;
      wa.ready();
      wa.expand();
      if (wa.isVersionAtLeast("7.7")) wa.disableVerticalSwipes?.();
      return wa;
    })
    .catch(() => null);
  return loading;
}

/* Login Widget popup for the desktop web — our own button, Telegram's auth window */
const WIDGET = "https://telegram.org/js/telegram-widget.js?22";
export async function telegramLoginPopup(botId: number) {
  await loadScript(WIDGET);
  return new Promise<Record<string, unknown> | null>((resolve) => {
    const login = window.Telegram?.Login;
    if (!login) return resolve(null);
    login.auth({ bot_id: botId, request_access: "write" }, (user) => resolve(user || null));
  });
}
