import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { VENDORS } from "@/data/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/studiyalar", "/studiyalar?tur=floristika", "/kafolat", "/hamkorlar", "/hamkorlar/royxat", "/yordam", "/biz-haqimizda", "/oferta", "/maxfiylik"];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...VENDORS.map((v) => ({ url: `${SITE_URL}/studio/${v.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
