import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartView } from "@/components/store/CartView";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Cart" : "سلة التسوق",
    robots: { index: false, follow: true },
  };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  return (
    <section className="paper min-h-[60vh]">
      <CartView locale={locale} dict={dict} />
    </section>
  );
}
