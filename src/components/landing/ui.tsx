import type { ImgHTMLAttributes, ReactNode } from "react";
import { Arrow18, Arrow20, CheckCircle, CrossCircle } from "./icons";

/* Landing primitives — mirror the Figma components (🧩 Components page):
   Landing/Eyebrow 224:1629 · Landing/CTA 247:1153 · Landing/ListItem 292:3246 · Landing/Badge 302:5261 */

export function Img({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP in /public/landing; next/image adds nothing here
  return <img decoding="async" alt={alt} {...props} />;
}

export function Meter({ on = 6, fade = true }: { on?: number; fade?: boolean }) {
  return (
    <span className={`lp-meter${fade ? " lp-fade" : ""}`} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} className={i < on ? "on" : undefined} />
      ))}
    </span>
  );
}

export function Eyebrow({ children, media = false }: { children: ReactNode; media?: boolean }) {
  return (
    <span className={`lp-eyebrow lp-caps${media ? " lp-eyebrow--media" : ""}`}>
      <Meter />
      {children}
    </span>
  );
}

type CtaProps = {
  href: string;
  children: ReactNode;
  tone: "light" | "brand" | "glass";
  size?: "l" | "m";
  block?: boolean;
  external?: boolean;
};
export function Cta({ href, children, tone, size = "l", block, external = true }: CtaProps) {
  const cls = `lp-cta lp-cta--${tone}${size === "m" ? " lp-cta--m" : ""}${block ? " lp-cta--block" : ""}`;
  return (
    <a className={cls} href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
      {children}
      <span className="lp-cta__icon">{size === "m" ? <Arrow18 /> : <Arrow20 />}</span>
    </a>
  );
}

export function ListItem({ children, type = "check", tone = "default" }: { children: ReactNode; type?: "check" | "cross"; tone?: "default" | "onbrand" }) {
  const cls = `lp-li${type === "cross" ? " lp-li--cross" : ""}${tone === "onbrand" ? " lp-li--onbrand" : ""}`;
  return (
    <li className={cls}>
      {type === "cross" ? <CrossCircle /> : <CheckCircle />}
      {children}
    </li>
  );
}

export function Logo() {
  return (
    <span className="lp-logo">
      <span className="lp-logo__mark" aria-hidden>D</span>
      Datelle Studio
    </span>
  );
}

export function SectionHead({ eyebrow, title, text, id }: { eyebrow: string; title: string; text?: ReactNode; id?: string }) {
  return (
    <div className="lp-head">
      <div className="lp-head__title">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="lp-h2" id={id}>{title}</h2>
      </div>
      {text ? <p className="lp-body">{text}</p> : null}
    </div>
  );
}
