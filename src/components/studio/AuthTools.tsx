"use client";

import { useState } from "react";
import { StudioIcon } from "./icons";
import { applyTheme, storedTheme, type PanelTheme } from "./theme";

/* Light / dark segmented pill (40px). Web only — inside Telegram the Mini App follows Telegram's theme.
   Used on Kirish (top-right of the form column) and in Sozlamalar → Koʻrinish. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<PanelTheme>(() => (typeof window === "undefined" ? "light" : storedTheme()));
  const pick = (t: PanelTheme) => {
    setTheme(t);
    applyTheme(t);
  };
  return (
    <div className="ds-seg" role="group" aria-label="Mavzu">
      <button type="button" aria-pressed={theme === "light"} aria-label="Yorugʻ mavzu" title="Yorugʻ" onClick={() => pick("light")}>
        <StudioIcon name="sun" variant="Line" size={18} />
      </button>
      <button type="button" aria-pressed={theme === "dark"} aria-label="Qorongʻi mavzu" title="Qorongʻi" onClick={() => pick("dark")}>
        <StudioIcon name="moon" variant="Line" size={18} />
      </button>
    </div>
  );
}

/* Kirish top bar (Figma "Login/Toolbar"). Language switch removed until the panel ships in Russian —
   a disabled "RU" read as broken; it comes back with the translation. */
export function AuthTools() {
  return (
    <div className="ds-auth-tools">
      <ThemeSwitch />
    </div>
  );
}
