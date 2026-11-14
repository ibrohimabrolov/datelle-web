"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/* Figma Button: Style Primary / Secondary / Ghost / Destructive · Size L 52 / M 44 · radius full.
   Loading keeps the width (label hidden, spinner centered) so layouts never jump. */
export function Button({
  variant = "primary",
  size = "m",
  block,
  loading,
  icon,
  children,
  disabled,
  ...rest
}: {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "l" | "m";
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="ds-btn"
      data-style={variant}
      data-size={size}
      data-block={block || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {loading && <span className="ds-spinner" aria-hidden />}
    </button>
  );
}
