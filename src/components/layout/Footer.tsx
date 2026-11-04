import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Instagram, Facebook, Mail, Phone, Whatsapp } from "@/components/ui/Icons";
import { brand, payments } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

const year = new Date().getFullYear();

export type FooterContact = {
  instagram: string;
  facebook: string;
  whatsappNumber: string;
  phoneDisplay: string;
  email: string;
};

export function Footer({
  locale,
  dict,
  contact,
  logoSrc,
}: {
  locale: Locale;
  dict: Dictionary;
  contact: FooterContact;
  logoSrc?: string;
}) {
  const L = (href: string) => `/${locale}${href}`;
  const socials = [
    { href: contact.instagram, label: "Instagram", Icon: Instagram },
    { href: contact.facebook, label: "Facebook", Icon: Facebook },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden bg-forest-deep text-sage">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(210,175,106,0.55), transparent 42%), radial-gradient(circle at 88% 90%, rgba(165,173,145,0.35), transparent 45%)",
        }}
      />

      <div className="container-page relative py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo locale={locale} variant="inline" tone="ivory" src={logoSrc} />
            <p className="mt-5 max-w-xs text-[0.85rem] leading-7 text-sage/80">{dict.footer.blurb}</p>

            <div className="mt-6 flex items-center gap-3">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-full border border-gold/25 text-gold-pale/80 transition-colors hover:border-gold hover:text-gold-pale"
                >
                  <Icon size={16} />
                </a>
              ))}
              {contact.whatsappNumber ? (
                <a
                  href={`https://wa.me/${contact.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="WhatsApp"
                  className="grid size-9 place-items-center rounded-full border border-gold/25 text-gold-pale/80 transition-colors hover:border-gold hover:text-gold-pale"
                >
                  <Whatsapp size={16} />
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-[0.7rem] tracking-[0.24em] text-gold">{dict.footer.shopTitle}</h3>
            <ul className="space-y-2.5 text-[0.85rem]">
              <li><Link href={L("/shop")} className="transition-colors hover:text-ivory">{dict.footer.links.allProducts}</Link></li>
              <li><Link href={L("/olive")} className="transition-colors hover:text-ivory">{dict.footer.links.olive}</Link></li>
              <li><Link href={L("/story")} className="transition-colors hover:text-ivory">{dict.footer.links.story}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-[0.7rem] tracking-[0.24em] text-gold">{dict.footer.serviceTitle}</h3>
            <ul className="space-y-2.5 text-[0.85rem]">
              <li><Link href={L("/contact")} className="transition-colors hover:text-ivory">{dict.footer.links.contact}</Link></li>
              <li><Link href={L("/shipping")} className="transition-colors hover:text-ivory">{dict.footer.links.shipping}</Link></li>
            </ul>
            <div className="mt-6 space-y-2 text-[0.8rem] text-sage/80">
              {contact.phoneDisplay ? (
                <a href={`tel:${contact.phoneDisplay.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-ivory">
                  <Phone size={14} className="text-gold" /> <span dir="ltr">{contact.phoneDisplay}</span>
                </a>
              ) : null}
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-ivory">
                  <Mail size={14} className="text-gold" /> <span dir="ltr">{contact.email}</span>
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-[0.7rem] tracking-[0.24em] text-gold">{dict.footer.legalTitle}</h3>
            <ul className="space-y-2.5 text-[0.85rem]">
              <li><Link href={L("/shipping")} className="transition-colors hover:text-ivory">{dict.footer.links.shipping}</Link></li>
              <li><Link href={L("/privacy")} className="transition-colors hover:text-ivory">{dict.footer.links.privacy}</Link></li>
              <li><Link href={L("/terms")} className="transition-colors hover:text-ivory">{dict.footer.links.terms}</Link></li>
            </ul>

            <h3 className="mb-3 mt-6 text-[0.7rem] tracking-[0.24em] text-gold">{dict.footer.paymentTitle}</h3>
            <span className="inline-flex items-center rounded-xs border border-gold/25 px-3 py-1.5 text-[0.7rem] text-sage/90">
              {locale === "ar" ? payments.cod.labelAr : payments.cod.labelEn}
            </span>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-gold/15 pt-6 text-[0.72rem] text-sage/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {brand.fullNameAr} — {dict.footer.rights}
          </p>
          <p className="text-sage/45">{dict.footer.builtNote}</p>
        </div>
      </div>
    </footer>
  );
}
