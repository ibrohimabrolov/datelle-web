import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BRAND } from "@/config/brand";
import { SITE_URL } from "@/config/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — Toshkentda dekor va floristlarni sana boʻyicha bron qiling`,
    template: `%s · ${BRAND.name}`,
  },
  description: "Siz tanlagan kunda boʻsh boʻlgan tekshirilgan dekor studiyalari va floristlar. Ochiq narx, himoyalangan zadatok.",
  applicationName: BRAND.name,
  openGraph: { type: "website", siteName: BRAND.name, locale: "uz_UZ" },
  twitter: { card: "summary_large_image" },
  /* Search Console / Yandex Webmaster ownership for floreal.uz. These tokens are public by
     design (they ship in every page's HTML); env vars override them if the property changes. */
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "umz3CW6MWaunZEbADHr_L6R4iewwxcoMCACIRuR4pfs",
    yandex: process.env.YANDEX_VERIFICATION || "ee43971a34a0b6c3",
  },
};

export const viewport = { themeColor: "#1e5a45" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={inter.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
