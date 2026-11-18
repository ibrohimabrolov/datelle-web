import { BRAND } from "@/config/brand";

/* Floreal mark — 1:1 from Figma "Brand/Mark" (404:12839): four calendar cells that bloom,
   the top-right petal (accent) is the booked day.
   Colours come from --ds-logo-petal / --ds-logo-accent (studio tokens: light → green, dark → cream);
   outside .studio the fallbacks below apply. On a dark surface set --ds-logo-petal: #f6f5f1. */
const PETALS = [
  "M0 0H4.725C8.36534 0 10.1855 0 11.5759 0.708458C12.799 1.33163 13.7934 2.32601 14.4165 3.54906C15.125 4.93949 15.125 6.75966 15.125 10.4V15.125H10.4C6.75966 15.125 4.93949 15.125 3.54906 14.4165C2.32601 13.7934 1.33163 12.799 0.708458 11.5759C0 10.1855 0 8.36534 0 4.725V0Z",
  "M0 27.275C0 23.6347 0 21.8145 0.708458 20.4241C1.33163 19.201 2.32601 18.2066 3.54906 17.5835C4.93949 16.875 6.75966 16.875 10.4 16.875H15.125V21.6C15.125 25.2403 15.125 27.0605 14.4165 28.4509C13.7934 29.674 12.799 30.6684 11.5759 31.2915C10.1855 32 8.36534 32 4.725 32H0V27.275Z",
  "M16.875 16.875H21.6C25.2403 16.875 27.0605 16.875 28.4509 17.5835C29.674 18.2066 30.6684 19.201 31.2915 20.4241C32 21.8145 32 23.6347 32 27.275V32H27.275C23.6347 32 21.8145 32 20.4241 31.2915C19.201 30.6684 18.2066 29.674 17.5835 28.4509C16.875 27.0605 16.875 25.2403 16.875 21.6V16.875Z",
];
const ACCENT =
  "M16.875 10.4C16.875 6.75966 16.875 4.93949 17.5835 3.54906C18.2066 2.32601 19.201 1.33163 20.4241 0.708458C21.8145 0 23.6347 0 27.275 0H32V4.725C32 8.36534 32 10.1855 31.2915 11.5759C30.6684 12.799 29.674 13.7934 28.4509 14.4165C27.0605 15.125 25.2403 15.125 21.6 15.125H16.875V10.4Z";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden focusable="false" className={className}>
      {PETALS.map((d) => (
        <path key={d} d={d} fill="var(--ds-logo-petal, #1e5a45)" />
      ))}
      <path d={ACCENT} fill="var(--ds-logo-accent, #e9806a)" />
    </svg>
  );
}

/* Logo/Lockup — mark + wordmark. `height` = mark size. */
export function Lockup({ height = 30, className }: { height?: number; className?: string }) {
  const fontSize = height * 0.66;
  return (
    <span className={`inline-flex items-center ${className ?? ""}`} style={{ gap: height * 0.375 }}>
      <LogoMark size={height} />
      <span className="font-semibold" style={{ fontSize, lineHeight: `${height}px`, letterSpacing: "-0.02em" }}>
        {BRAND.wordmark}
      </span>
    </span>
  );
}
