import type { Metadata, Viewport } from "next";
import { THEME_BOOT } from "@/components/studio/theme";
import "@/studio/tokens.css";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "Datelle Studio — dekor studiyalari va floristlar uchun" },
  description: "Sanalar, buyurtmalar va pul — bir joyda. Kalendar, avans va qoldiq, jamoa. Telefonda — Telegram ichida, kompyuterda — brauzerda. Birinchi 10 ta studiya uchun 3 oy bepul.",
  alternates: { canonical: "/biznes" },
  openGraph: { title: "Datelle Studio", description: "Sanalar, buyurtmalar va pul — bir joyda.", url: "/biznes", images: ["/landing/hero.webp"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f11" },
  ],
};

/* Datelle Studio landing — own design system scope (.studio tokens + .landing), no marketplace nav/footer.
   Theme: light by default, dark via the header toggle; the choice is shared with the panel ("ds-theme")
   and applied before first paint by THEME_BOOT — no flash. */
export default function BiznesLayout({ children }: LayoutProps<"/biznes">) {
  return (
    <div className="studio landing" id="top" data-theme="light" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      {children}
    </div>
  );
}
