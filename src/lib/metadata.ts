import type { Metadata } from "next";
import { getSettings } from "./settings";
import type { Locale } from "./products";

/** One social card image. Dimensions keep crawler previews stable. */
export type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

/**
 * Complete Open Graph object for a page.
 *
 * Next.js *replaces* the layout `openGraph` object when a page declares its
 * own — it does not deep-merge it. Declaring only `{ url }` therefore dropped
 * the shared social image and downgraded `twitter:card` to `summary`, so every
 * page that needs a page-specific `og:url` must pass the full object.
 */
export async function buildOpenGraph({
  locale,
  path,
  title,
  description,
  images,
  type = "website",
}: {
  locale: Locale;
  /** Locale-relative path, e.g. `/ar/shop`. Resolved against `metadataBase`. */
  path: string;
  title: string;
  description: string;
  /** Overrides the store-wide card (products pass their own photo). */
  images?: SocialImage[];
  type?: "website" | "article";
}): Promise<NonNullable<Metadata["openGraph"]>> {
  const settings = await getSettings();
  const isAr = locale === "ar";
  const siteName = isAr ? settings.store.nameAr : settings.store.nameEn;
  return {
    type,
    locale: isAr ? "ar_EG" : "en_US",
    url: path,
    siteName,
    title,
    description,
    // A real JPEG social card — WebP uploads are not rendered by most link
    // preview crawlers (Facebook, WhatsApp, LinkedIn).
    images: images ?? [
      {
        url: "/products/bottle-card.jpg",
        width: 1200,
        height: 1500,
        alt: isAr
          ? `${siteName} — زيت زيتون بكر ممتاز`
          : `${siteName} — extra virgin olive oil`,
      },
    ],
  };
}
