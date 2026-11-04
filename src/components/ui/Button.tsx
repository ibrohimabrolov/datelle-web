import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/* Button — Figma 145:101. Type: Primary / Secondary / Ghost · Size: Lg 52 / Md 44 / Sm 34 */
type Variant = "primary" | "secondary" | "ghost";
type Size = "lg" | "md" | "sm";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-subtle",
  ghost: "text-brand hover:bg-brand-subtle",
};
const sizes: Record<Size, string> = {
  lg: "h-[52px] px-6 rounded-xl text-[16px] leading-5",
  md: "h-11 px-4 rounded-lg text-[14px] leading-[18px]",
  sm: "h-[34px] px-3 rounded-md text-[13px] leading-4",
};

type Common = {
  variant?: Variant;
  size?: Size;
  trailingIcon?: IconName;
  leadingIcon?: IconName;
  className?: string;
  children: ReactNode;
};

export function buttonClass(variant: Variant = "primary", size: Size = "lg", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

function Inner({ leadingIcon, trailingIcon, size = "lg", children }: Common) {
  const s = size === "lg" ? 20 : 18;
  return (
    <>
      {leadingIcon && <Icon name={leadingIcon} size={s} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={s} />}
    </>
  );
}

export function Button({ variant, size, className, ...p }: Common & Omit<ComponentProps<"button">, "children">) {
  const { leadingIcon, trailingIcon, children, ...rest } = p;
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      <Inner size={size} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({ variant, size, className, href, ...p }: Common & { href: string }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      <Inner size={size} {...p} />
    </Link>
  );
}

/* Text link — Figma 238:98 (Body S Semibold + arrow-right 16) */
export function TextLink({ href, children, tone = "brand" }: { href: string; children: ReactNode; tone?: "brand" | "white" }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 py-3 t-body-sb ${tone === "brand" ? "text-brand" : "text-white"}`}
    >
      {children}
      <Icon name="arrowRight" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
