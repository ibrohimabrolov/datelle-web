"use client";

import { useState } from "react";
import { StudioIcon } from "./icons";
import { applyTheme, storedTheme, type PanelTheme } from "./theme";

/* Kirish top bar (Figma "Login/Toolbar"): language + theme, two 40px segmented pills side by side.
   RU is visible but off until the panel is translated — same pattern as the marketplace header. */
export function AuthTools() {
  const [theme, setTheme] = useState<PanelTheme>(() => (typeof window === "undefined" ? "light" : storedTheme()));
  const pick = (t: PanelTheme) => {
    setTheme(t);
    applyTheme(t);
  };
  return (
    <div className="ds-auth-tools">
      <div className="ds-seg" role="group" aria-label="Til">
        <button type="button" aria-pressed="true">
          UZ
        </button>
        <button type="button" aria-pressed="false" disabled title="Rus tili tez orada">
          RU
        </button>
      </div>
      <div className="ds-seg" role="group" aria-label="Mavzu">
        <button type="button" aria-pressed={theme === "light"} aria-label="Yorugʻ mavzu" title="Yorugʻ" onClick={() => pick("light")}>
          <StudioIcon name="sun" variant="Line" size={18} />
        </button>
        <button type="button" aria-pressed={theme === "dark"} aria-label="Qorongʻi mavzu" title="Qorongʻi" onClick={() => pick("dark")}>
          <StudioIcon name="moon" variant="Line" size={18} />
        </button>
      </div>
    </div>
  );
}
