import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { getSiteDictionary } from "@/lib/content";
import { getSettings, toCheckoutConfig } from "@/lib/settings";
import type { Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Checkout" : "إتمام الطلب",
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, settings] = await Promise.all([getSiteDictionary(locale), getSettings()]);
  return (
    <section className="paper min-h-[70vh]">
      <CheckoutForm locale={locale} dict={dict} config={toCheckoutConfig(settings)} />
    </section>
  );
}
