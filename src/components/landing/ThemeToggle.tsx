"use client";

import { applyTheme } from "@/components/studio/theme";
import { IconMoon, IconSun } from "./icons";

/* Header theme toggle (Figma: IconButton Ghost "ThemeToggle" in Landing/Header 292:3804).
   Same stored choice as the panel ("ds-theme"): light by default, dark on request.
   Both icons render; CSS shows the right one from [data-theme], so SSR and client always match. */
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const el = document.querySelector<HTMLElement>(".studio");
    applyTheme(el?.dataset.theme === "dark" ? "light" : "dark");
  };
  return (
    <button type="button" className={`lp-theme${className ? ` ${className}` : ""}`} onClick={toggle} aria-label="Mavzuni almashtirish (kunduzgi / tungi)">
      <IconMoon className="lp-theme__moon" />
      <IconSun className="lp-theme__sun" />
    </button>
  );
}
