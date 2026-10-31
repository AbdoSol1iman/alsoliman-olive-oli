import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/ar", "/en"],
        disallow: [
          "/admin",
          "/ar/cart",
          "/en/cart",
          "/ar/checkout",
          "/en/checkout",
          "/ar/order",
          "/en/order",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
