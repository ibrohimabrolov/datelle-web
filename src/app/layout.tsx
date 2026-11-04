import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BRAND } from "@/config/brand";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — Toshkentda dekor va floristlarni sana boʻyicha bron qiling`,
  description: "Siz tanlagan kunda boʻsh boʻlgan tekshirilgan dekor studiyalari va floristlar. Ochiq narx, himoyalangan zadatok.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
