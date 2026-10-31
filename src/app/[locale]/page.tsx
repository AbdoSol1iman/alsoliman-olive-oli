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
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale !== "en";
  return {
    title: isAr ? "آل سليمان | زيت زيتون بكر ممتاز" : "Alsuliman | Extra virgin olive oil",
    description: isAr
      ? "زيت زيتون بكر ممتاز من آل سليمان — عناية بالجودة، طعم أصيل، وتوصيل لجميع محافظات مصر."
      : "Extra virgin olive oil by Alsuliman — care for quality, authentic taste, delivery across Egypt.",
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en" },
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <TrustStrip dict={dict} />
      <FeaturedProducts locale={locale} dict={dict} />
      <StorySection locale={locale} dict={dict} />
      <WhySection locale={locale} dict={dict} />
      <CulinarySection dict={dict} />
      <ReviewsSection locale={locale} dict={dict} />
      <Newsletter dict={dict} />
    </>
  );
}
