import { SITE_URL } from "@/config/site";
import type { Copy } from "./copy";
import { BOT_URL } from "./data";

/* Structured data for /biznes (schema.org): who makes it, what it is and costs, and the FAQ.
   Everything here mirrors visible page content — no ratings or reviews we don't have. */
const ORG_ID = `${SITE_URL}/#organization`;
const num = (s: string) => s.replace(/\D/g, "");

function graph(t: Copy) {
  const URL_ = `${SITE_URL}${t.home}`;
  const { monthly, yearly } = t.pricing.plans;
  const offer = (name: string, price: string) => ({ "@type": "Offer", name, price, priceCurrency: "UZS", url: `${URL_}#narxlar` });
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "Floreal",
        url: SITE_URL,
        logo: `${SITE_URL}/apple-icon.png`,
        areaServed: { "@type": "City", name: t.seo.city },
      },
      {
        "@type": "WebPage",
        "@id": `${URL_}#webpage`,
        url: URL_,
        name: t.seo.pageName,
        inLanguage: t.lang,
        isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Floreal", publisher: { "@id": ORG_ID } },
        primaryImageOfPage: `${URL_}/opengraph-image.jpg`,
        about: { "@id": `${URL_}#app` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${URL_}#app`,
        name: "Floreal",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "CRM",
        operatingSystem: "Web, Telegram",
        url: URL_,
        installUrl: BOT_URL,
        inLanguage: "uz",
        description: t.seo.appDescription,
        featureList: t.seo.features,
        publisher: { "@id": ORG_ID },
        offers: [
          offer(t.seo.offers.monthly, num(monthly.price)),
          offer(t.seo.offers.yearly, num(yearly.price)),
          offer(t.seo.offers.founder, "0"),
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${URL_}#faq`,
        inLanguage: t.lang,
        mainEntity: t.faq.flatMap((tab) =>
          tab.items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
        ),
      },
    ],
  };
}

export function JsonLd({ t }: { t: Copy }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph(t)).replace(/</g, "\\u003c") }}
    />
  );
}
