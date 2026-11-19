import type { NextConfig } from "next";

/* The client marketplace (studiyalar, studio pages, zadatok, partner form) is frozen — floreal.uz is the
   studio landing. Its routes redirect home until MARKETPLACE=on is set at build time; the code stays. */
const MARKETPLACE = process.env.MARKETPLACE === "on";
const MARKETPLACE_ROUTES = ["/bozor", "/studiyalar", "/studio/:path*", "/kirish", "/sorov/:path*", "/bronlarim", "/hamkorlar/:path*", "/hamkorlar", "/kafolat", "/biz-haqimizda", "/yordam", "/oferta"];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // the landing moved from /biznes to the root (2026-11-19) — keep old shared links working
      { source: "/biznes", destination: "/", permanent: true },
      { source: "/ru/biznes", destination: "/ru", permanent: true },
      ...(MARKETPLACE ? [] : MARKETPLACE_ROUTES.map((source) => ({ source, destination: "/", permanent: false }))),
    ];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Smeta PDF reads Inter TTFs from disk at runtime
  outputFileTracingIncludes: { "/api/panel/orders/*/smeta": ["./assets/fonts/*.ttf"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
