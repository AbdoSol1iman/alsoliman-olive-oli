import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Static routes per locale. Admin/cart/checkout/order are intentionally excluded. */
const staticPaths = [
  { path: "", frequency: "weekly" as const, priority: 1 },
  { path: "/shop", frequency: "weekly" as const, priority: 0.9 },
  { path: "/story", frequency: "monthly" as const, priority: 0.6 },
  { path: "/olive", frequency: "monthly" as const, priority: 0.5 },
  { path: "/contact", frequency: "monthly" as const, priority: 0.5 },
  { path: "/shipping", frequency: "yearly" as const, priority: 0.4 },
  { path: "/privacy", frequency: "yearly" as const, priority: 0.2 },
  { path: "/terms", frequency: "yearly" as const, priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const { products } = await getCatalog();
  const active = products.filter((p) => p.active);

  const pages = (["ar", "en"] as const).flatMap((locale) =>
    staticPaths.map(({ path, frequency, priority }) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      changeFrequency: frequency,
      priority,
    })),
  );

  const productPages = (["ar", "en"] as const).flatMap((locale) =>
    active.map((product) => ({
      url: `${siteUrl}/${locale}/product/${product.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  );

  return [...pages, ...productPages];
}
