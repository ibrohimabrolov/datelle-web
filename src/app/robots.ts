import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/sorov/", "/bronlarim", "/kirish", "/studio/*/taklif", "/api/", "/admin"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
