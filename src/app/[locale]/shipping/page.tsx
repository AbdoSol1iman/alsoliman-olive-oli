import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { getSettings } from "@/lib/settings";
import { getSiteDictionary } from "@/lib/content";
import { formatPrice } from "@/lib/format";
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
  const [dict, settings] = await Promise.all([getSiteDictionary(locale), getSettings()]);
  const isAr = locale === "ar";
  const shipping = settings.shipping;
  const zones = Object.entries(shipping.zones);

  return (
    <>
      <PageHeader eyebrow={dict.shippingPage.eyebrow} title={dict.shippingPage.title} body={dict.shippingPage.body} />

      <section className="paper py-14 md:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:gap-16">
          <div>
            <div className="mb-6 border border-forest/25 bg-cream/50 p-5">
              <h2 className="text-[1.05rem] text-forest">{dict.shippingPage.freeTitle}</h2>
              <ul className="mt-3 space-y-2 text-[0.85rem] leading-7 text-ink-muted">
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                  {dict.shippingPage.freeCityLine}
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                  {dict.shippingPage.freeWholesaleLine.replace("{n}", String(shipping.wholesaleMinQty))}
                </li>
                {shipping.freeThreshold !== null && shipping.freeThreshold > 0 ? (
                  <li className="flex items-start gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                    {isAr
                      ? `شحن مجاني للطلبات التي تصل قيمتها إلى ${formatPrice(shipping.freeThreshold, locale)}`
                      : `Free shipping on orders reaching ${formatPrice(shipping.freeThreshold, locale)}`}
                  </li>
                ) : null}
              </ul>
            </div>

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
