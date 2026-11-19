import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { PanelProvider, Splash } from "@/components/studio/PanelProvider";
import { THEME_BOOT } from "@/components/studio/theme";
import "@/studio/tokens.css";
import "./studio.css";

export const metadata: Metadata = {
  title: { absolute: "Floreal", template: "%s · Floreal" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover", // safe-area insets inside Telegram and iOS
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f11" },
  ],
};

/* Floreal — internal tool for studios. Separate design system (.studio scope), separate session (dt_panel).
   Static shell; all data comes from /api/panel/* on the client. */
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    // data-theme is set before paint by THEME_BOOT (stored choice, light by default); Telegram overrides it in PanelProvider
    <div className="studio" data-theme="light" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <Suspense fallback={<Splash />}>
        <PanelProvider>{children}</PanelProvider>
      </Suspense>
    </div>
  );
}
