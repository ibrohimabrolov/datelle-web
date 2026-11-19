import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { VENDORS } from "@/data/catalog";

/* floreal.uz = the studio landing (uz + ru). The client marketplace is frozen and redirected
   (next.config MARKETPLACE) — its pages join the sitemap only when MARKETPLACE=on. */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { uz: `${SITE_URL}/`, ru: `${SITE_URL}/ru` };
  const landing: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1, alternates: { languages } },
    { url: `${SITE_URL}/ru`, changeFrequency: "weekly", priority: 0.9, alternates: { languages } },
    { url: `${SITE_URL}/maxfiylik`, changeFrequency: "yearly", priority: 0.2 },
  ];
  if (process.env.MARKETPLACE !== "on") return landing;
  const pages = ["/bozor", "/studiyalar", "/studiyalar?tur=floristika", "/kafolat", "/hamkorlar", "/hamkorlar/royxat", "/yordam", "/biz-haqimizda", "/oferta"];
  return [
    ...landing,
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...VENDORS.map((v) => ({ url: `${SITE_URL}/studio/${v.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
