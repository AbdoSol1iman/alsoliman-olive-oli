import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalBody } from "@/components/layout/LegalBody";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSiteDictionary } from "@/lib/content";
import { buildOpenGraph } from "@/lib/metadata";
import type { Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale !== "en";
  const title = isAr ? "سياسة الخصوصية" : "Privacy policy";
  return {
    title,
    description: title,
    alternates: { canonical: `/${locale}/privacy`, languages: { ar: "/ar/privacy", en: "/en/privacy" } },
    openGraph: await buildOpenGraph({
      locale: isAr ? "ar" : "en",
      path: `/${isAr ? "ar" : "en"}/privacy`,
      title,
      description: title,
    }),
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getSiteDictionary(locale);

  return (
    <>
      <PageHeader eyebrow={dict.footer.legalTitle} title={dict.privacyPage.title} />
      <section className="paper py-14 md:py-20">
        <div className="container-page max-w-3xl">
          <p className="mb-8 text-[0.72rem] tracking-[0.14em] text-ink-muted">
            {dict.privacyPage.updated}: 2026
          </p>
          <LegalBody sections={dict.privacyPage.sections} />
        </div>
      </section>
    </>
  );
}
