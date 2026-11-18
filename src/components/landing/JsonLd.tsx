import { SITE_URL } from "@/config/site";
import { BOT_URL, FAQ, PLANS } from "./data";

/* Structured data for /biznes (schema.org): who makes it, what it is and costs, and the FAQ.
   Everything here mirrors visible page content — no ratings or reviews we don't have. */
const URL_ = `${SITE_URL}/biznes`;
const ORG_ID = `${SITE_URL}/#organization`;
const num = (s: string) => s.replace(/\D/g, "");

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Datelle",
      url: SITE_URL,
      logo: `${SITE_URL}/apple-icon.png`,
      areaServed: { "@type": "City", name: "Toshkent" },
    },
    {
      "@type": "WebPage",
      "@id": `${URL_}#webpage`,
      url: URL_,
      name: "Datelle Studio — dekor studiyalari va floristlar uchun CRM",
      inLanguage: "uz",
      isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Datelle", publisher: { "@id": ORG_ID } },
      primaryImageOfPage: `${URL_}/opengraph-image.jpg`,
      about: { "@id": `${URL_}#app` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${URL_}#app`,
      name: "Datelle Studio",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "CRM",
      operatingSystem: "Web, Telegram",
      url: URL_,
      installUrl: BOT_URL,
      inLanguage: "uz",
      description:
        "Dekor studiyalari va floristlar uchun CRM: bron kalendari, buyurtmalar, avans va qoldiq hisobi, jamoa. Telefonda — Telegram ichida, kompyuterda — brauzerda.",
      featureList: ["Bron kalendari", "Buyurtmalar", "Avans va qoldiq hisobi", "Jamoa va rollar", "Tushum hisoboti"],
      publisher: { "@id": ORG_ID },
      offers: [
        { "@type": "Offer", name: "Oylik", price: num(PLANS.monthly.price), priceCurrency: "UZS", url: `${URL_}#narxlar` },
        { "@type": "Offer", name: "Yillik", price: num(PLANS.yearly.price), priceCurrency: "UZS", url: `${URL_}#narxlar` },
        { "@type": "Offer", name: "Asoschi hamkor — 3 oy", price: "0", priceCurrency: "UZS", url: `${URL_}#narxlar` },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${URL_}#faq`,
      mainEntity: FAQ.flatMap((t) =>
        t.items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
      ),
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
