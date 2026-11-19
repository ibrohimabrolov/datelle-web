import type { Viewport } from "next";
import { LandingShell, landingMetadata } from "@/components/landing/LandingPage";
import "@/studio/tokens.css";
import "../(landing)/landing.css";

export const metadata = landingMetadata("ru");

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f11" },
  ],
};

export default function RuLandingLayout({ children }: { children: React.ReactNode }) {
  return <LandingShell lang="ru">{children}</LandingShell>;
}
