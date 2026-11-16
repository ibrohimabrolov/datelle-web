"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";

/* Figma "Illustration/3D" set — transparent 512px WebP in /public/studio/3d. */
export type StudioArt = "kalendar" | "pul" | "jamoa" | "bot" | "tolangan" | "topilmadi" | "xato" | "muddat" | "qulf";

export function Illustration({ art, size, className }: { art: StudioArt; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static 512px WebP, sized by CSS; next/image adds nothing here
    <img
      src={`/studio/3d/${art}.webp`}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      width={512}
      height={512}
      className={className ? `ds-art ${className}` : "ds-art"}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

/* Figma state block (S2/S3/S4 xato · topilmadi · qoldiq yoʻq):
   desktop — 3D 200, gap 24, Heading/H1 28/36, Body 15/22 secondary, max 480, Secondary M;
   mobile  — 3D 120, gap 12, Heading/H2 20/28, button +12 (24 from text). No card — centered in the content area. */
export function StateBlock({
  art,
  title,
  children,
  action,
  alert,
}: {
  art: StudioArt;
  title: string;
  children: ReactNode;
  action?: { label: string; onClick(): void; icon?: ReactNode; primary?: boolean };
  alert?: boolean;
}) {
  return (
    <div className="ds-stateblock" role={alert ? "alert" : undefined}>
      <Illustration art={art} />
      <div className="ds-stateblock-text">
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {action && (
        <Button variant={action.primary ? "primary" : "secondary"} icon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
