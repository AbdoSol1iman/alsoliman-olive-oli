import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/home/Hero";
import { Newsletter } from "@/components/home/Newsletter";
import {
  CulinarySection,
  FeaturedProducts,
  ReviewsSection,
  StorySection,
  TrustStrip,
  WhySection,
} from "@/components/home/Sections";
import { getStoreProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getSiteDictionary, getSiteExtras } from "@/lib/content";
import { buildFeaturedItems } from "@/lib/products";
import type { Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSettings();
  const isAr = locale !== "en";
  return {
    title: isAr ? settings.seo.titleAr : settings.seo.titleEn,
    description: isAr ? settings.seo.descriptionAr : settings.seo.descriptionEn,
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en" },
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, products, settings, extras] = await Promise.all([
    getSiteDictionary(locale),
    getStoreProducts(),
    getSettings(),
    getSiteExtras(locale),
  ]);
  const featured = buildFeaturedItems(products);

  return (
    <>
      <Hero locale={locale} dict={dict} image={extras.media.heroImage || undefined} />
      <TrustStrip dict={dict} />
      <FeaturedProducts
        locale={locale}
        dict={dict}
        items={featured}
        sampleCatalog={settings.flags.sampleCatalog}
      />
      <StorySection locale={locale} dict={dict} image={extras.media.storyImage || undefined} />
      <WhySection locale={locale} dict={dict} image={extras.media.whyImage || undefined} />
      <CulinarySection dict={dict} />
      <ReviewsSection locale={locale} dict={dict} />
      <Newsletter dict={dict} />
    </>
  );
}
