import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactForm } from "@/components/store/ContactForm";
import { Whatsapp, Mail, Phone, Pin } from "@/components/ui/Icons";
import { contact } from "@/lib/config";
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
    title: isAr ? "تواصل معنا" : "Contact us",
    description: isAr ? "تواصل مع آل سليمان للاستفسار عن المنتجات أو الطلبات." : "Contact Alsuliman about products or orders.",
    alternates: { canonical: `/${locale}/contact`, languages: { ar: "/ar/contact", en: "/en/contact" } },
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const isAr = locale === "ar";

  const channels = [
    contact.whatsappNumber && {
      Icon: Whatsapp,
      label: "WhatsApp",
      value: `+${contact.whatsappNumber}`,
      href: `https://wa.me/${contact.whatsappNumber}`,
    },
    contact.phoneDisplay && {
      Icon: Phone,
      label: dict.common.phone,
      value: contact.phoneDisplay,
      href: `tel:${contact.phoneDisplay.replace(/\s/g, "")}`,
    },
    contact.email && {
      Icon: Mail,
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
    contact.addressAr && {
      Icon: Pin,
      label: isAr ? "العنوان" : "Address",
      value: contact.addressAr,
      href: null,
    },
  ].filter(Boolean) as { Icon: typeof Mail; label: string; value: string; href: string | null }[];

  return (
    <>
      <PageHeader eyebrow={dict.contact.eyebrow} title={dict.contact.title} body={dict.contact.body} />

      <section className="paper py-16 md:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_0.75fr] lg:gap-16">
          <ContactForm locale={locale} dict={dict} />

          <aside className="space-y-8">
            <div className="border border-gold/20 bg-cream/30 p-6">
              <h2 className="text-[0.65rem] tracking-[0.22em] text-gold">{dict.contact.channels}</h2>
              {channels.length === 0 ? (
                <p className="mt-4 text-[0.82rem] leading-7 text-ink-muted">
                  {isAr
                    ? "لم تُضف بيانات التواصل بعد. يمكن ضبطها من متغيرات البيئة."
                    : "Contact details are not configured yet. They can be set via environment variables."}
                </p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {channels.map((c) => (
                    <li key={c.label} className="flex items-start gap-3">
                      <c.Icon size={17} className="mt-1 shrink-0 text-gold" />
                      <div className="min-w-0">
                        <p className="text-[0.68rem] tracking-[0.14em] text-ink-muted">{c.label}</p>
                        {c.href ? (
                          <a
                            href={c.href}
                            target={c.href.startsWith("http") ? "_blank" : undefined}
                            rel="noreferrer noopener"
                            className="break-all text-[0.88rem] text-forest hover:text-olive"
                          >
                            {c.value}
                          </a>
                        ) : (
                          <p className="text-[0.88rem] text-forest">{c.value}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-gold/20 bg-ivory p-6">
              <h2 className="text-[0.65rem] tracking-[0.22em] text-gold">{dict.contact.hours}</h2>
              <p className="mt-3 text-[0.88rem] text-forest">{dict.contact.hoursValue}</p>
              <p className="mt-1 text-[0.75rem] text-ink-muted">
                {isAr
                  ? "الرد على واتساب خلال ساعات العمل."
                  : "WhatsApp replies during working hours."}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
