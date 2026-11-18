import type { Metadata, Viewport } from "next";
import { THEME_BOOT } from "@/components/studio/theme";
import "@/studio/tokens.css";
import "./landing.css";

const TITLE = "Datelle Studio — dekor studiyalari va floristlar uchun CRM";
const DESCRIPTION =
  "Dekor studiyalari va floristlar uchun CRM: bron kalendari, buyurtmalar, avans va qoldiq, jamoa. Telegram'da ishlaydi. Birinchi 10 ta studiyaga 3 oy bepul.";

/* SEO: keyword-first title (≤60) and description (≤155). The share image comes from the
   opengraph-image.jpg / twitter-image.jpg files next to this layout (1200×630). */
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/biznes" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    siteName: "Datelle",
    locale: "uz_UZ",
    url: "/biznes",
    title: "Datelle Studio — sanalar, buyurtmalar va pul bir joyda",
    description: "Dekor studiyalari va floristlar uchun CRM: bron kalendari, avans va qoldiq, jamoa. Birinchi 10 ta studiyaga 3 oy bepul.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Datelle Studio — sanalar, buyurtmalar va pul bir joyda",
    description: "Dekor studiyalari va floristlar uchun CRM. Birinchi 10 ta studiyaga 3 oy bepul.",
  },
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
