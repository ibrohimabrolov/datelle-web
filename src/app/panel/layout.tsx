import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { PanelProvider, Splash } from "@/components/studio/PanelProvider";
import "@/studio/tokens.css";
import "./studio.css";

export const metadata: Metadata = {
  title: { default: "Datelle Studio", template: "%s · Datelle Studio" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover", // safe-area insets inside Telegram and iOS
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f11" },
  ],
};

/* Datelle Studio — internal tool for studios. Separate design system (.studio scope), separate session (dt_panel).
   Static shell; all data comes from /api/panel/* on the client. */
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <div className="studio">
      <Suspense fallback={<Splash />}>
        <PanelProvider>{children}</PanelProvider>
      </Suspense>
    </div>
  );
}
