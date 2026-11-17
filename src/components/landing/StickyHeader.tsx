"use client";

import { useEffect, useState } from "react";
import { BOT_URL, LOGIN_URL, NAV } from "./data";
import { Cta, Logo } from "./ui";

/* Header · State=Sticky (Figma 292:3804 / spec 293:1670): slides in once the hero nav has scrolled away (> 760px). */
export function StickyHeader() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 760);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp-sticky" data-shown={shown} aria-hidden={!shown} inert={!shown}>
      <div className="lp-sticky__inner">
        <a href="#top" aria-label="Datelle Studio — tepaga"><Logo /></a>
        <nav className="lp-nav__links" aria-label="Boʻlimlar">
          {NAV.map((l) => (
            <a key={l.href} className="lp-navlink" href={l.href}>{l.label}</a>
          ))}
        </nav>
        <div className="lp-nav__actions">
          <a className="lp-btn lp-btn--ghost" href={LOGIN_URL}>Kirish</a>
          <Cta href={BOT_URL} tone="brand" size="m">3 oy bepul boshlash</Cta>
        </div>
      </div>
    </div>
  );
}
