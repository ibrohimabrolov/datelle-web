import type { Metadata } from "next";
import { THEME_BOOT } from "@/components/studio/theme";
import { COPY, type Lang } from "./copy";
import { Hero } from "./Hero";
import { JsonLd } from "./JsonLd";
import { Backdrop } from "./Motion";
import { Compare, Features, Footer, Marquee, Partners, Pricing, Product, Questions, Stats, Steps } from "./Sections";
import { StickyHeader } from "./StickyHeader";

/* One landing, two languages: / (uz, x-default) and /ru (ru). Same layout, same CSS, copy from ./copy.
   Figma XNmqL3kbnh0lPpzO6ZQKUR · 🌐 Landing · 299:2859. */

const SEO: Record<Lang, { title: string; description: string; ogTitle: string; ogDescription: string; twDescription: string; locale: string }> = {
  uz: {
    title: "Floreal — dekor studiyalari va floristlar uchun CRM",
    description:
      "Dekor studiyalari va floristlar uchun CRM: bron kalendari, buyurtmalar, avans va qoldiq, jamoa. Telegram'da ishlaydi. Birinchi oy — bepul.",
    ogTitle: "Floreal — sanalar, buyurtmalar va pul bir joyda",
    ogDescription: "Dekor studiyalari va floristlar uchun CRM: bron kalendari, avans va qoldiq, jamoa. Birinchi oy — bepul.",
    twDescription: "Dekor studiyalari va floristlar uchun CRM. Birinchi oy — bepul.",
    locale: "uz_UZ",
  },
  ru: {
    title: "Floreal — CRM для декор-студий и флористов в Ташкенте",
    description:
      "CRM для декор-студий и флористов: календарь броней, заказы, аванс и остаток, команда. Работает в Telegram. Первый месяц — бесплатно.",
    ogTitle: "Floreal — даты, заказы и деньги в одном месте",
    ogDescription: "CRM для декор-студий и флористов: календарь броней, аванс и остаток, команда. Первый месяц — бесплатно.",
    twDescription: "CRM для декор-студий и флористов. Первый месяц — бесплатно.",
    locale: "ru_RU",
  },
};

/* hreflang pair — both pages list both, uz is the default for everyone else. */
const LANGUAGES = { uz: "/", ru: "/ru", "x-default": "/" };

/* SEO: keyword-first title (≤60) and description (≤160). The share image comes from the
   opengraph-image.jpg / twitter-image.jpg files next to each route's layout (1200×630). */
export function landingMetadata(lang: Lang): Metadata {
  const s = SEO[lang];
  const url = COPY[lang].home;
  return {
    title: { absolute: s.title },
    description: s.description,
    alternates: { canonical: url, languages: LANGUAGES },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      type: "website",
      siteName: "Floreal",
      locale: s.locale,
      alternateLocale: lang === "uz" ? ["ru_RU"] : ["uz_UZ"],
      url,
      title: s.ogTitle,
      description: s.ogDescription,
    },
    twitter: { card: "summary_large_image", title: s.ogTitle, description: s.twDescription },
  };
}

/* Shell — own design system scope (.studio tokens + .landing), no marketplace nav/footer.
   Theme: light by default, dark via the header toggle; the choice is shared with the panel ("ds-theme")
   and applied before first paint by THEME_BOOT — no flash.
   The root <html lang> is "uz" for the whole site; the RU page sets lang on its scope and on <html> before paint. */
export function LandingShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const boot = lang === "uz" ? THEME_BOOT : `document.documentElement.lang="${lang}";${THEME_BOOT}`;
  return (
    <div className="studio landing" id="top" lang={lang} data-theme="light" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      {children}
    </div>
  );
}

export function LandingPage({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  return (
    <>
      <JsonLd t={t} />
      <Backdrop />
      <StickyHeader t={t} />
      <Hero t={t} />
      <main>
        <Stats t={t} />
        <Compare t={t} />
        <Product t={t} />
        <Features t={t} />
        <Steps t={t} />
        <Pricing t={t} />
        <Partners t={t} />
        <Questions t={t} />
        <Marquee t={t} />
      </main>
      <Footer t={t} />
    </>
  );
}
