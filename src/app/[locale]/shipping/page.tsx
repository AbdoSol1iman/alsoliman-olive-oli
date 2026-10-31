import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { shipping, type ZoneKey } from "@/lib/config";
import { formatPrice } from "@/lib/format";
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
    title: isAr ? "الشحن والإرجاع" : "Shipping & returns",
    description: isAr
      ? "مصروفات الشحن ومدة التوصيل لجميع محافظات مصر، وسياسة الإرجاع."
      : "Shipping fees and delivery times across Egypt, plus our returns policy.",
    alternates: { canonical: `/${locale}/shipping`, languages: { ar: "/ar/shipping", en: "/en/shipping" } },
  };
}

export default async function ShippingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const isAr = locale === "ar";
  const zones = Object.entries(shipping.zones) as [ZoneKey, (typeof shipping.zones)[ZoneKey]][];

  return (
    <>
      <PageHeader eyebrow={dict.shippingPage.eyebrow} title={dict.shippingPage.title} body={dict.shippingPage.body} />

      <section className="paper py-14 md:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:gap-16">
          <div>
            <div className="overflow-hidden border border-gold/20">
              <table className="w-full border-collapse text-[0.85rem]">
                <caption className="sr-only">{dict.shippingPage.title}</caption>
                <thead>
                  <tr className="bg-forest text-ivory">
                    <th scope="col" className="px-4 py-3 text-start font-medium">
                      {dict.shippingPage.tableGov}
                    </th>
                    <th scope="col" className="px-4 py-3 text-start font-medium">
                      {dict.shippingPage.tableFee}
                    </th>
                    <th scope="col" className="px-4 py-3 text-start font-medium">
                      {dict.shippingPage.tableDays}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/15 bg-ivory">
                  {zones.map(([key, zone]) => (
                    <tr key={key} className="transition-colors hover:bg-cream/40">
                      <th scope="row" className="px-4 py-3 text-start font-normal text-forest">
                        {isAr ? zone.ar : zone.en}
                      </th>
                      <td className="tnum px-4 py-3 text-ink-muted">{formatPrice(zone.fee, locale)}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {zone.days} {isAr ? "يوم" : "days"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[0.72rem] text-ink-muted">{dict.shippingPage.disclaimer}</p>
          </div>

          <aside className="space-y-6">
            <div className="border border-gold/20 bg-cream/30 p-6">
              <h2 className="text-[1.2rem]">{dict.shippingPage.returnsTitle}</h2>
              <p className="mt-3 text-[0.85rem] leading-8 text-ink-muted">{dict.shippingPage.returnsBody}</p>
            </div>
            <div className="border border-gold/20 bg-ivory p-6">
              <h2 className="text-[1.2rem]">{dict.product.shippingTitle}</h2>
              <p className="mt-3 text-[0.85rem] leading-8 text-ink-muted">
                {isAr ? shipping.notesAr : shipping.notesEn}
              </p>
            </div>
            <ButtonLink href={`/${locale}/contact`} variant="outline" size="md" className="w-full">
              {dict.footer.links.contact}
            </ButtonLink>
          </aside>
        </div>
      </section>
    </>
  );
}
