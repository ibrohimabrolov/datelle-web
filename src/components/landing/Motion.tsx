"use client";

import { useEffect, useRef } from "react";

/* Landing motion + background (Figma "04 · Motion · Desktop" 352:11508, "BG / Pattern" 348:11502).
 * - Backdrop: 48px dot grid aligned to the 1200 rails, soft brand glows, cursor spotlight (calendar cells).
 * - Scroll reveal: elements matched by REVEAL fade up once when they enter the viewport.
 * - Marquee runs only while on screen.
 * Hiding/animating is CSS-gated by (scripting: enabled) and (prefers-reduced-motion: no-preference),
 * so no-JS and reduced-motion visitors get the static page. */

/* Keep in sync with the reveal block in landing.css */
const REVEAL = [
  ".lp-head__title > *",
  ".lp-head > .lp-body",
  ".lp-head > .lp-cta",
  ".lp-stat",
  ".lp-compare > *",
  ".lp-tour > *",
  ".lp-features > *",
  ".lp-steps > *",
  ".lp-plans > *",
  ".lp-wall",
  ".lp-faq",
  ".lp-footer__top",
].join(",");

const GRID = 48; // px — dot/cell pitch
const HALF = 1200; // dots layer is 2400px wide, centred → a dot lands on the left rail (50% − 600px)
const SPOT = 440; // spotlight diameter

const GLOWS = [
  { x: 40, y: 320, w: 1180, h: 960, dx: 60, dy: -40, t: 18 }, // hero, right
  { x: -1260, y: 1980, w: 1220, h: 1220, dx: 80, dy: 40, t: 22 }, // tour, left
  { x: 80, y: 4660, w: 1180, h: 1180, dx: -60, dy: 50, t: 20 }, // pricing, right
  { x: -1240, y: 6180, w: 1120, h: 1120, dx: 70, dy: -30, t: 24 }, // FAQ, left
];

export function Backdrop() {
  const bgRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  // Scroll reveal + marquee visibility
  useEffect(() => {
    const root = bgRef.current?.closest<HTMLElement>(".landing");
    if (!root) return;
    root.setAttribute("data-motion-ready", "");

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          reveal.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );
    root.querySelectorAll(REVEAL).forEach((el) => reveal.observe(el));

    const marquee = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.toggleAttribute("data-run", e.isIntersecting);
    });
    root.querySelectorAll(".lp-marquee").forEach((el) => marquee.observe(el));

    return () => {
      reveal.disconnect();
      marquee.disconnect();
    };
  }, []);

  // Cursor spotlight — desktop pointers only, eased follow, paused when idle
  useEffect(() => {
    const bg = bgRef.current;
    const spot = spotRef.current;
    if (!bg || !spot) return;
    const ok = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!ok.matches) return;

    let cx = -1, cy = -1; // last pointer (client coords)
    let tx = 0, ty = 0, x = 0, y = 0; // target / current (bg coords)
    let raf = 0;
    let seeded = false;

    const place = () => {
      const sx = x - SPOT / 2, sy = y - SPOT / 2;
      const ox = bg.clientWidth / 2 - HALF; // dots layer origin inside bg
      spot.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      // keep both tiles locked to the page grid while the window moves
      spot.style.backgroundPosition = `${ox + GRID / 2 - sx}px ${GRID / 2 - sy}px, ${ox - sx}px ${-sy}px`;
    };
    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      place();
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const aim = () => {
      if (cx < 0) return;
      const r = bg.getBoundingClientRect();
      tx = cx - r.left;
      ty = cy - r.top;
      if (!seeded) { x = tx; y = ty; seeded = true; }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cx = e.clientX; cy = e.clientY;
      spot.setAttribute("data-on", "");
      aim();
    };
    const onLeave = (e: MouseEvent) => { if (!e.relatedTarget) spot.removeAttribute("data-on"); };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", aim, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", aim);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <div className="lp-bg" ref={bgRef} aria-hidden>
      {GLOWS.map((g, i) => (
        <span
          key={i}
          className="lp-bg__glow"
          style={{
            left: `calc(50% + ${g.x}px)`, top: g.y, width: g.w, height: g.h,
            ["--dx" as string]: `${g.dx}px`, ["--dy" as string]: `${g.dy}px`, animationDuration: `${g.t}s`,
          }}
        />
      ))}
      <div className="lp-bg__grid">
        <span className="lp-bg__dots" />
        <span className="lp-bg__spot" ref={spotRef} />
      </div>
    </div>
  );
}
