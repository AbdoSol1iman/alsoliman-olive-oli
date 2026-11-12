"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowEnd, Check, Chevron, Leaf, Plus } from "@/components/ui/Icons";
import { useAddToCart, useCatalogProducts } from "@/lib/catalog-client";
import { useCartStore } from "@/lib/cart-store";
import { trackEvent } from "@/lib/analytics";
import { cx, formatPrice } from "@/lib/format";
import type { Dictionary, OfferItem } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

export function OfferCard({
  offer,
  locale,
  dict,
}: {
  offer: OfferItem;
  locale: Locale;
  dict: Dictionary;
}) {
  const products = useCatalogProducts();
  const add = useAddToCart();
  const openCart = useCartStore((s) => s.open);
  const [justAdded, setJustAdded] = useState(false);

  // Build the list of available sizes/variants for the dropdown
  const availableOptions = useMemo(() => {
    const matchingProducts = offer.productId
      ? products.filter((p) => p.id === offer.productId && p.active && !p.comingSoon)
      : products.filter((p) => p.active && !p.comingSoon);

    const list: {
      productId: string;
      variantId: string;
      label: string;
      price: number;
      disabled: boolean;
    }[] = [];

    for (const prod of matchingProducts) {
      for (const v of prod.variants) {
        const soldOut = v.stock !== null && v.stock <= 0;
        const sizeName = locale === "ar" ? v.sizeLabelAr : v.sizeLabelEn;
        const prodName = locale === "ar" ? prod.nameAr : prod.nameEn;
        const label =
          matchingProducts.length > 1
            ? `${prodName} — ${sizeName} (${formatPrice(v.price, locale)})${soldOut ? ` - ${dict.common.outOfStock}` : ""}`
            : `${sizeName} — ${formatPrice(v.price, locale)}${soldOut ? ` - ${dict.common.outOfStock}` : ""}`;

        list.push({
          productId: prod.id,
          variantId: v.id,
          label,
          price: v.price,
          disabled: soldOut,
        });
      }
    }
    return list;
  }, [products, offer.productId, locale, dict]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    availableOptions[0]?.variantId ?? "",
  );

  const activeVariantId = selectedVariantId || (availableOptions[0]?.variantId ?? "");
  const selectedOption =
    availableOptions.find((opt) => opt.variantId === activeVariantId) ??
    availableOptions[0];

  const ctaLabel = offer.cta?.trim() || dict.common.addToCart;
  const href = offer.href?.trim() || `/${locale}/shop`;
  const hasDropdown = Boolean(offer.hasDropdown) && availableOptions.length > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedOption || selectedOption.disabled) return;

    add(selectedOption.productId, selectedOption.variantId, 1);
    trackEvent("AddToCart", {
      productId: selectedOption.productId,
      variantId: selectedOption.variantId,
      value: selectedOption.price,
      metadata: { qty: 1, placement: "offer_card" },
    });
    openCart();
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const cardImage = (
    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-cream via-ivory to-gold/20">
      {offer.image ? (
        <Image
          src={offer.image}
          alt={offer.title || (locale === "ar" ? "عرض" : "Offer")}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
        />
      ) : (
        <Leaf
          size={30}
          className="absolute inset-0 m-auto text-gold/50"
          aria-hidden
        />
      )}
    </div>
  );

  const cardText = (
    <>
      {offer.title ? <h3 className="text-[1.05rem] font-medium text-forest">{offer.title}</h3> : null}
      {offer.subtitle ? (
        <p className="mt-1.5 text-[0.82rem] leading-7 text-ink-muted">{offer.subtitle}</p>
      ) : null}
    </>
  );

  const baseCardClass =
    "group flex h-full flex-col overflow-hidden border border-gold/20 bg-ivory transition-all duration-300 hover:border-forest/40 hover:shadow-sm";

  // CASE 1: Offer WITH dropdown menu -> adds the selected variant directly to cart
  if (hasDropdown) {
    return (
      <article className={baseCardClass}>
        {offer.href ? (
          <Link href={offer.href} className="block overflow-hidden focus:outline-hidden">
            {cardImage}
          </Link>
        ) : (
          cardImage
        )}

        <div className="flex flex-1 flex-col p-5">
          {offer.href ? (
            <Link href={offer.href} className="hover:text-olive focus:outline-hidden">
              {cardText}
            </Link>
          ) : (
            cardText
          )}

          <div className="mt-auto pt-4">
            <div className="relative">
              <select
                value={activeVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                aria-label={locale === "ar" ? "اختر الحجم" : "Select size"}
                className="h-10 w-full appearance-none rounded-xs border border-gold/30 bg-ivory-deep px-3 pe-8 text-[0.8rem] text-forest shadow-2xs transition-colors focus:border-forest focus:outline-hidden cursor-pointer"
              >
                {availableOptions.map((opt) => (
                  <option key={opt.variantId} value={opt.variantId} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-gold"
              >
                <Chevron size={14} className="rotate-90" />
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={selectedOption?.disabled}
              aria-label={`${dict.common.addToCart} — ${offer.title}`}
              className={cx(
                "mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xs border text-[0.8rem] tracking-wide transition-all duration-300",
                selectedOption?.disabled
                  ? "cursor-not-allowed border-forest/15 text-ink-muted/50"
                  : justAdded
                    ? "border-forest bg-forest text-ivory"
                    : "border-forest bg-forest text-ivory hover:bg-forest-deep shadow-xs cursor-pointer",
              )}
            >
              {justAdded ? <Check size={15} /> : <Plus size={15} />}
              <span>{justAdded ? dict.common.added : ctaLabel}</span>
            </button>
          </div>
        </div>
      </article>
    );
  }

  // CASE 2: Standard promotional offer without dropdown -> links to offer destination
  const innerContent = (
    <>
      {cardImage}
      <div className="flex flex-1 flex-col p-5">
        {cardText}
        <div className="mt-auto pt-5">
          <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xs border border-forest/20 text-[0.8rem] tracking-wide text-forest transition-all duration-300 group-hover:border-forest group-hover:bg-forest group-hover:text-ivory">
            <ArrowEnd
              size={14}
              className="text-gold transition-transform duration-500 group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1"
            />
            <span>{ctaLabel}</span>
          </span>
        </div>
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={baseCardClass}>
      {innerContent}
    </Link>
  ) : (
    <div className={baseCardClass}>{innerContent}</div>
  );
}
