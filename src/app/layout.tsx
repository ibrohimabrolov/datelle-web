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
};

export const viewport = { themeColor: "#1e5a45" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
