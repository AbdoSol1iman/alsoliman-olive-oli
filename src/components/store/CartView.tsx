"use client";

import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Trash } from "@/components/ui/Icons";
import { useCartLines } from "@/lib/catalog-client";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

export function CartView({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const lines = useCartLines();
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  if (lines.length === 0) {
    return (
      <div className="container-page py-20 text-center md:py-28">
        <div className="mx-auto max-w-md">
          <span className="mx-auto mb-6 grid size-16 place-items-center rounded-full border border-gold/30 text-gold">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
              <path d="M5.5 8h13l.9 11.2a1.6 1.6 0 0 1-1.6 1.8H6.2a1.6 1.6 0 0 1-1.6-1.8L5.5 8Z" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
            </svg>
          </span>
          <h1 className="text-[clamp(1.8rem,4vw,2.6rem)]">{dict.cart.empty}</h1>
          <p className="mt-3 text-[0.9rem] leading-8 text-ink-muted">{dict.cart.emptyBody}</p>
          <ButtonLink href={`/${locale}/shop`} size="lg" className="mt-8">
            {dict.cart.shopNow}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12 md:py-16">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="eyebrow">{dict.cart.title}</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)]">{dict.cart.title}</h1>
        </div>
        <Link href={`/${locale}/shop`} className="text-[0.78rem] text-ink-muted hover:text-forest">
          {dict.cart.continue}
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
        <ul className="divide-y divide-gold/15 border-y border-gold/15">
          {lines.map((line) => (
            <li key={line.key} className="flex gap-4 py-6 md:gap-6">
              <Link
                href={`/${locale}/product/${line.product.slug}?size=${line.variant.id}`}
                className="relative size-24 shrink-0 overflow-hidden bg-cream/60 md:size-32"
              >
                <Image
                  src={line.image.src}
                  alt={locale === "ar" ? line.image.altAr : line.image.altEn}
                  fill
                  sizes="128px"
                  className="object-contain object-bottom p-2"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.6rem] tracking-[0.2em] text-gold">
                      {locale === "ar" ? line.product.categoryAr : line.product.categoryEn}
                    </p>
                    <h2 className="mt-1 text-[1.1rem] leading-snug">
                      <Link href={`/${locale}/product/${line.product.slug}?size=${line.variant.id}`} className="hover:text-olive">
                        {locale === "ar" ? line.product.nameAr : line.product.nameEn}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[0.75rem] text-ink-muted">
                      {locale === "ar" ? line.variant.sizeLabelAr : line.variant.sizeLabelEn} ·{" "}
                      {formatPrice(line.variant.price, locale)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.variant.id)}
                    aria-label={`${dict.cart.remove} — ${locale === "ar" ? line.product.nameAr : line.product.nameEn}`}
                    className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-cream hover:text-forest"
                  >
                    <Trash size={16} />
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                  <QuantityStepper
                    size="sm"
                    value={line.qty}
                    min={1}
                    max={line.maxQty}
                    onChange={(n) => setQty(line.variant.id, n)}
                    label={dict.cart.qty}
                  />
                  <span className="tnum text-[0.95rem] font-medium text-forest">
                    {formatPrice(line.lineTotal, locale)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit border border-gold/25 bg-cream/30 p-6 lg:sticky lg:top-28">
          <h2 className="text-[1.2rem]">{dict.cart.title}</h2>
          <dl className="mt-5 space-y-3 text-[0.85rem]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{dict.cart.subtotal}</dt>
              <dd className="tnum text-forest">{formatPrice(subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{dict.cart.shipping}</dt>
              <dd className="text-[0.75rem] text-ink-muted">{dict.cart.shippingNote}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-center justify-between border-t border-gold/25 pt-5">
            <span className="text-[0.85rem] text-ink-muted">{dict.cart.total}</span>
            <span className="tnum text-[1.2rem] font-medium text-forest">
              {formatPrice(subtotal, locale)}
            </span>
          </div>
          <ButtonLink href={`/${locale}/checkout`} size="lg" className="mt-6 w-full">
            {dict.cart.checkout}
          </ButtonLink>
          <p className="mt-3 text-center text-[0.68rem] text-ink-muted">{dict.cart.taxes}</p>
        </aside>
      </div>
    </div>
  );
}
