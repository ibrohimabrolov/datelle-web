import type { ReactNode } from "react";

/* Eyebrow — pill with 6px dot (Figma "Eyebrow") */
export function Eyebrow({
  children,
  tone = "light",
  dot = "brand",
}: {
  children: ReactNode;
  tone?: "light" | "dark" | "glass";
  dot?: "brand" | "accent";
}) {
  const tones = {
    light: "bg-surface border border-line text-ink pl-2.5 pr-3 py-1.5",
    dark: "bg-white/8 border border-white/16 text-white pl-2.5 pr-3 py-1.5",
    glass: "bg-[rgba(15,13,10,0.45)] border border-white/22 text-white pl-3 pr-3.5 py-2 backdrop-blur-[12px]",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full t-cap-m ${tones[tone]}`}>
      <span className={`size-1.5 rounded-full ${dot === "brand" ? "bg-brand" : "bg-accent"}`} />
      {children}
    </span>
  );
}

/* Section container — 1440 frame, 120 side padding, 1200 content */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-[120px] ${className}`}>{children}</div>;
}

/* Two-line heading — Figma uses explicit line breaks; on mobile they collapse into flow */
export function Lines({ lines, mutedFrom, mutedClass }: { lines: string[]; mutedFrom?: number; mutedClass?: string }) {
  return (
    <>
      {lines.map((l, i) => (
        <span key={l} className={`block ${mutedFrom !== undefined && i >= mutedFrom ? mutedClass : ""}`}>
          {l}
        </span>
      ))}
    </>
  );
}
