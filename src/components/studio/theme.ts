/* Panel theme: light by default (Ibrohim's call — not the OS setting), dark on request,
   remembered per browser. Inside Telegram the Mini App follows Telegram's theme instead
   (PanelProvider), so the toggle is web-only. The pre-paint script in panel/layout.tsx
   applies the stored value before first paint — no flash. */
export type PanelTheme = "light" | "dark";
export const THEME_KEY = "ds-theme";

export function storedTheme(): PanelTheme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(t: PanelTheme) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode — still apply for this page */
  }
  const el = document.querySelector<HTMLElement>(".studio");
  if (el && el.dataset.platform !== "telegram") el.dataset.theme = t;
}

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");document.currentScript.parentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){}})()`;
