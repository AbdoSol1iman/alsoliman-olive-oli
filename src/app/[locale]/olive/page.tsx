import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { OliveBranch } from "@/components/brand/Logo";
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
    title: isAr ? "عن زيت الزيتون" : "About olive oil",
    description: isAr
      ? "دليل مختصر: معنى بكر ممتاز، التخزين الصحيح، والاستخدام اليومي لزيت الزيتون."
      : "A short guide: what extra virgin means, correct storage, and everyday use of olive oil.",
    alternates: { canonical: `/${locale}/olive`, languages: { ar: "/ar/olive", en: "/en/olive" } },
  };
}

export default async function OlivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader eyebrow={dict.olive.eyebrow} title={dict.olive.title} body={dict.olive.intro} />

      <section className="paper py-16 md:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-[0.4fr_1fr] lg:gap-20">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[0.62rem] tracking-[0.24em] text-gold">
              {locale === "ar" ? "المحتويات" : "CONTENTS"}
            </p>
            <ol className="mt-4 space-y-2">
              {dict.olive.sections.map((s, i) => (
                <li key={s.title}>
                  <a
                    href={`#section-${i + 1}`}
                    className="group flex items-baseline gap-3 text-[0.82rem] text-ink-muted transition-colors hover:text-forest"
                  >
                    <span className="tnum text-[0.7rem] text-gold/70">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-8 hidden lg:block">
              <OliveBranch className="h-48 w-auto opacity-25" tone="#B79A55" />
            </div>
          </aside>

          <div className="divide-y divide-gold/15 border-y border-gold/15">
            {dict.olive.sections.map((s, i) => (
              <article key={s.title} id={`section-${i + 1}`} className="scroll-mt-28 py-8 first:pt-0">
                <div className="flex items-baseline gap-4">
                  <span className="tnum font-display text-[1.1rem] text-gold/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-[1.45rem] leading-snug">{s.title}</h2>
                </div>
                <p className="mt-3 max-w-2xl ps-9 text-[0.92rem] leading-9 text-ink-muted">{s.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="container-page mt-12">
          <p className="border-s-2 border-gold/40 bg-cream/40 px-5 py-4 text-[0.75rem] leading-7 text-ink-muted">
            {dict.olive.disclaimer}
          </p>
        </div>
      </section>

      <section className="border-t border-gold/15 bg-cream/50 py-14 text-center">
        <div className="container-page">
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)]">
            {locale === "ar" ? "جاهز للتجربة؟" : "Ready to try it?"}
          </h2>
          <ButtonLink href={`/${locale}/shop`} size="lg" className="mt-6">
            {dict.hero.ctaPrimary}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
