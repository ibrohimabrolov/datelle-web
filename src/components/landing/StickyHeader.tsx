"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOT_URL, LOGIN_URL, MENU, NAV } from "./data";
import { IconClose, IconMenu } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { Cta, Logo } from "./ui";

/* Hero MenuButton (< 1024px) lives in the server-rendered hero; it opens the one menu below via this event. */
export const MENU_EVENT = "lp:menu";

export function MenuButton({ tone = "media" }: { tone?: "media" | "surface" }) {
  return (
    <button
      type="button"
      className={`lp-menubtn lp-menubtn--${tone}`}
      aria-label="Menyuni ochish"
      aria-haspopup="dialog"
      aria-controls="lp-menu"
      onClick={(e) => window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: e.currentTarget }))}
    >
      <IconMenu />
    </button>
  );
}

const DESKTOP = "(min-width: 1024px)";

/* Header · State=Sticky (Figma 292:3804 desktop / Landing/Header · Size=Mobile 304:5156, 318:11362)
   + Landing/Menu (318:9851 / 318:12858) + Landing/BottomBar (mobile only, 304:5156).
   Sticky bar slides in once the hero has scrolled under it (desktop: > 760px, as before).
   The bottom CTA bar follows it on phones and steps aside over the marquee/footer, which carry their own CTA. */
export function StickyHeader() {
  const barRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".lp-hero");
    let limit = 760;
    const measure = () => {
      const h = barRef.current?.offsetHeight || 72;
      limit = hero ? hero.offsetTop + hero.offsetHeight - h : 760;
      setShown(window.scrollY > limit);
    };
    const onScroll = () => setShown(window.scrollY > limit);
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    const ends = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) ends.add(e.target);
        else ends.delete(e.target);
      }
      setAtEnd(ends.size > 0);
    });
    document.querySelectorAll(".lp-marquee, .lp-footer").forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      io.disconnect();
    };
  }, []);

  const close = useCallback(() => menuRef.current?.close(), []);

  useEffect(() => {
    const dlg = menuRef.current;
    if (!dlg) return;
    const root = document.documentElement;
    const onOpen = () => {
      if (dlg.open) return;
      dlg.showModal();
      root.classList.add("lp-lock");
      setOpen(true);
    };
    const onClose = () => {
      root.classList.remove("lp-lock");
      setOpen(false);
    };
    // The menu only exists below 1024px — close it if the window grows past that
    const mq = window.matchMedia(DESKTOP);
    const onMq = () => {
      if (mq.matches && dlg.open) dlg.close();
    };

    window.addEventListener(MENU_EVENT, onOpen);
    dlg.addEventListener("close", onClose);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener(MENU_EVENT, onOpen);
      dlg.removeEventListener("close", onClose);
      mq.removeEventListener("change", onMq);
      root.classList.remove("lp-lock");
    };
  }, []);

  return (
    <>
      <div className="lp-sticky" role="region" aria-label="Tezkor menyu" data-shown={shown} aria-hidden={!shown} inert={!shown} ref={barRef}>
        <div className="lp-sticky__inner">
          <a href="#top"><Logo /><span className="lp-sr"> — tepaga</span></a>
          <nav className="lp-nav__links" aria-label="Boʻlimlar">
            {NAV.map((l) => (
              <a key={l.href} className="lp-navlink" href={l.href}>{l.label}</a>
            ))}
          </nav>
          <div className="lp-nav__actions">
            <ThemeToggle className="lp-d-only" />
            <a className="lp-btn lp-btn--ghost lp-d-only" href={LOGIN_URL}>Kirish</a>
            <Cta href={BOT_URL} tone="brand" size="m" className="lp-d-only">3 oy bepul boshlash</Cta>
            <a className="lp-cta lp-cta--brand lp-cta--m lp-cta--text lp-t-only" href={BOT_URL} target="_blank" rel="noopener">Boshlash</a>
            <MenuButton tone="surface" />
          </div>
        </div>
      </div>

      <div className="lp-bottombar" role="region" aria-label="Boshlash" data-shown={shown && !atEnd && !open} aria-hidden={!shown || atEnd} inert={!shown || atEnd}>
        <Cta href={BOT_URL} tone="brand" block>Telegram&apos;da boshlash</Cta>
      </div>

      <dialog
        id="lp-menu"
        className="lp-menu"
        aria-label="Menyu"
        ref={menuRef}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="lp-menu__sheet">
          <div className="lp-menu__top">
            <a href="#top" onClick={close}><Logo /><span className="lp-sr"> — tepaga</span></a>
            <div className="lp-menu__tools">
              <ThemeToggle />
              <button type="button" className="lp-menubtn lp-menubtn--surface" aria-label="Menyuni yopish" onClick={close} autoFocus>
                <IconClose />
              </button>
            </div>
          </div>
          <nav aria-label="Boʻlimlar (menyu)">
            <ul className="lp-menu__links">
              {MENU.map((l) => (
                <li key={l.href}><a href={l.href} onClick={close}>{l.label}</a></li>
              ))}
            </ul>
          </nav>
          <div className="lp-menu__actions">
            <Cta href={BOT_URL} tone="brand" block>Telegram&apos;da boshlash</Cta>
            <a className="lp-btn lp-btn--flat" href={LOGIN_URL}>Kirish</a>
          </div>
        </div>
      </dialog>
    </>
  );
}
