import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalBody } from "@/components/layout/LegalBody";
import { PageHeader } from "@/components/layout/PageHeader";
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
  const title = isAr ? "الشروط والأحكام" : "Terms & conditions";
  return {
    title,
    description: title,
    alternates: { canonical: `/${locale}/terms`, languages: { ar: "/ar/terms", en: "/en/terms" } },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader eyebrow={dict.footer.legalTitle} title={dict.termsPage.title} />
      <section className="paper py-14 md:py-20">
        <div className="container-page max-w-3xl">
          <LegalBody sections={dict.termsPage.sections} />
        </div>
      </section>
    </>
  );
}
