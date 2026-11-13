"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
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
  const addOffer = useCartStore((s) => s.addOffer);
  const openCart = useCartStore((s) => s.open);
  const [justAdded, setJustAdded] = useState(false);

  // 1. Resolve combined products/variants from offer.productIds or offer.productId
  const combinedItems = useMemo(() => {
    const rawIds: string[] = Array.isArray(offer.productIds) && offer.productIds.length > 0
      ? offer.productIds
      : offer.productId
        ? [offer.productId]
        : [];

    const counts: Record<string, number> = {};
    for (const id of rawIds) {
      if (id && typeof id === "string" && id.trim()) {
        counts[id] = (counts[id] || 0) + 1;
      }
    }

    const list: {
      productId: string;
      variantId: string;
      productName: string;
      sizeLabel: string;
      unitPrice: number;
      qty: number;
      disabled: boolean;
    }[] = [];

    for (const [id, qty] of Object.entries(counts)) {
      // Look up by variant id first
      let foundProd = products.find((p) => p.variants.some((v) => v.id === id));
      let foundVar = foundProd?.variants.find((v) => v.id === id);

      // Otherwise look up by product id
      if (!foundProd || !foundVar) {
        foundProd = products.find((p) => p.id === id);
        foundVar = foundProd?.variants[0];
      }

      if (foundProd && foundVar) {
        const soldOut = foundVar.stock !== null && foundVar.stock < qty;
        list.push({
          productId: foundProd.id,
          variantId: foundVar.id,
          productName: locale === "ar" ? foundProd.nameAr : foundProd.nameEn,
          sizeLabel: locale === "ar" ? foundVar.sizeLabelAr : foundVar.sizeLabelEn,
          unitPrice: foundVar.price,
          qty,
          disabled: soldOut || !foundProd.active || Boolean(foundProd.comingSoon),
        });
      }
    }

    return list;
  }, [products, offer.productIds, offer.productId, locale]);

  const hasCombined = combinedItems.length > 0;
  const combinedTotal = combinedItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

  // Pricing: use explicit offer price if set, else sum of combined items
  const effectivePrice = offer.price && Number(offer.price) > 0
    ? Number(offer.price)
    : (hasCombined ? combinedTotal : 0);

  const compareAtPrice = offer.compareAt && Number(offer.compareAt) > 0
    ? Number(offer.compareAt)
    : (hasCombined && combinedTotal > effectivePrice ? combinedTotal : null);

  const hasDiscount = compareAtPrice !== null && effectivePrice > 0 && compareAtPrice > effectivePrice;
  const discountSavings = hasDiscount ? compareAtPrice - effectivePrice : 0;

  // 2. Dropdown options (either for choosing size, or bundle vs individual components)
  const dropdownOptions = useMemo(() => {
    // If combined items exist and dropdown is requested
    if (hasCombined && offer.hasDropdown) {
      const options = [
        {
          id: "__bundle__",
          label:
            locale === "ar"
              ? `العرض كاملاً (${combinedItems.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ""}${i.sizeLabel}`).join(" + ")}) — ${formatPrice(effectivePrice, locale)}`
              : `Full Offer (${combinedItems.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ""}${i.sizeLabel}`).join(" + ")}) — ${formatPrice(effectivePrice, locale)}`,
          isBundle: true,
          disabled: combinedItems.some((i) => i.disabled),
        },
      ];

      for (const item of combinedItems) {
        options.push({
          id: item.variantId,
          label: `${item.productName} — ${item.sizeLabel} (${formatPrice(item.unitPrice, locale)})`,
          isBundle: false,
          disabled: item.disabled,
        });
      }
      return options;
    }

    // Standard dropdown mode (all store products or matching product)
    if (offer.hasDropdown) {
      const matchingProducts = offer.productId
        ? products.filter((p) => p.id === offer.productId && p.active && !p.comingSoon)
        : products.filter((p) => p.active && !p.comingSoon);

      const list: {
        id: string;
        label: string;
        isBundle: boolean;
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
              : `${sizeName} — ${formatPrice(v.price, locale)})${soldOut ? ` - ${dict.common.outOfStock}` : ""}`;

          list.push({
            id: v.id,
            label,
            isBundle: false,
            disabled: soldOut,
          });
        }
      }
      return list;
    }

    return [];
  }, [hasCombined, offer.hasDropdown, offer.productId, combinedItems, effectivePrice, locale, products, dict]);

  const [selectedDropdownId, setSelectedDropdownId] = useState<string>(
    dropdownOptions[0]?.id ?? "",
  );

  const activeDropdownId = selectedDropdownId || (dropdownOptions[0]?.id ?? "");
  const selectedDropdownOption =
    dropdownOptions.find((opt) => opt.id === activeDropdownId) ?? dropdownOptions[0];

  const ctaLabel = offer.cta?.trim() || dict.common.addToCart;
  const href = offer.href?.trim() || `/${locale}/shop`;
  const isActionable = hasCombined || (Boolean(offer.hasDropdown) && dropdownOptions.length > 0);

  // Add to cart handler
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Immediate visual feedback on the button
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);

    // Case A: Dropdown is active and individual variant is selected
    if (offer.hasDropdown && selectedDropdownOption && !selectedDropdownOption.isBundle) {
      const targetVariantId = selectedDropdownOption.id;
      const prod = products.find((p) => p.variants.some((v) => v.id === targetVariantId));
      if (!prod) return;
      startTransition(() => {
        add(prod.id, targetVariantId, 1);
        openCart();
      });
      trackEvent("AddToCart", {
        productId: prod.id,
        variantId: targetVariantId,
        metadata: { placement: "offer_dropdown" },
      });
      return;
    }

    // Case B: Combined bundle
    if (hasCombined) {
      if (combinedItems.some((i) => i.disabled)) return;
      startTransition(() => {
        addOffer({
          id: offer.title || "bundle",
          title: offer.title,
          subtitle: offer.subtitle || (locale === "ar" ? "عرض خاص" : "Special Offer"),
          price: effectivePrice,
          image: offer.image || "/products/bottle-cutout.png",
          productIds: combinedItems.map((i) => i.variantId),
        });
        openCart();
      });
      trackEvent("AddToCart", {
        productId: "offer",
        variantId: offer.title || "bundle",
        value: effectivePrice,
        metadata: { placement: "offer_combined" },
      });
      return;
    }

    // Case C: Standard single dropdown option
    if (selectedDropdownOption && !selectedDropdownOption.disabled) {
      const targetVariantId = selectedDropdownOption.id;
      const prod = products.find((p) => p.variants.some((v) => v.id === targetVariantId));
      if (!prod) return;
      startTransition(() => {
        add(prod.id, targetVariantId, 1);
        openCart();
      });
      trackEvent("AddToCart", {
        productId: prod.id,
        variantId: targetVariantId,
        metadata: { placement: "offer_single" },
      });
      return;
    }

    // Case D: General offer with a title and price
    if (effectivePrice > 0 && offer.title) {
      startTransition(() => {
        addOffer({
          id: offer.title,
          title: offer.title,
          subtitle: offer.subtitle || (locale === "ar" ? "عرض خاص" : "Special Offer"),
          price: effectivePrice,
          image: offer.image || "/products/bottle-cutout.png",
          productIds: offer.productId ? [offer.productId] : undefined,
        });
        openCart();
      });
      trackEvent("AddToCart", {
        productId: "offer",
        variantId: offer.title,
        value: effectivePrice,
        metadata: { placement: "offer_standalone" },
      });
    }
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
      {offer.title ? (
        <h3 className="text-[1.05rem] font-medium text-forest">{offer.title}</h3>
      ) : null}
      {offer.subtitle ? (
        <p className="mt-1.5 text-[0.82rem] leading-7 text-ink-muted">{offer.subtitle}</p>
      ) : null}
    </>
  );

  const baseCardClass =
    "group flex h-full flex-col overflow-hidden border border-gold/20 bg-ivory transition-all duration-300 hover:border-forest/40 hover:shadow-sm";

  // CASE 1: Actionable card (Combined products bundle OR Dropdown active)
  if (isActionable) {
    const isCartDisabled = Boolean(
      (offer.hasDropdown && selectedDropdownOption?.disabled) ||
      (!offer.hasDropdown && hasCombined && combinedItems.some((i) => i.disabled)),
    );

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

          <div className="mt-auto pt-4 space-y-3">
            {/* Combined products tags */}
            {hasCombined ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.68rem] font-medium text-gold">
                  {locale === "ar" ? "يشمل:" : "Includes:"}
                </span>
                {combinedItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-xs border border-forest/15 bg-cream/50 px-2 py-0.5 text-[0.72rem] text-forest font-medium"
                  >
                    {item.qty > 1 ? `${item.qty} × ` : ""}{item.sizeLabel}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Price row with "السعر قبل الخصم" */}
            {effectivePrice > 0 || compareAtPrice !== null ? (
              <div className="flex flex-wrap items-baseline gap-2.5">
                {effectivePrice > 0 ? (
                  <span className="text-[1.12rem] font-semibold text-forest">
                    {formatPrice(effectivePrice, locale)}
                  </span>
                ) : null}
                {compareAtPrice !== null && compareAtPrice > 0 ? (
                  <span className="text-[0.82rem] text-ink-muted/80 line-through">
                    {formatPrice(compareAtPrice, locale)}
                  </span>
                ) : null}
                {hasDiscount ? (
                  <span className="rounded-xs bg-gold/20 px-2 py-0.5 text-[0.66rem] font-medium text-forest-deep">
                    {locale === "ar"
                      ? `وفّر ${formatPrice(discountSavings, locale)}`
                      : `Save ${formatPrice(discountSavings, locale)}`}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Dropdown if requested */}
            {offer.hasDropdown && dropdownOptions.length > 0 ? (
              <div className="relative">
                <select
                  value={activeDropdownId}
                  onChange={(e) => setSelectedDropdownId(e.target.value)}
                  aria-label={locale === "ar" ? "اختر العرض أو الحجم" : "Select offer option"}
                  className="h-10 w-full appearance-none rounded-xs border border-gold/30 bg-ivory-deep px-3 pe-8 text-[0.8rem] text-forest shadow-2xs transition-colors focus:border-forest focus:outline-hidden cursor-pointer"
                >
                  {dropdownOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.disabled}>
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
            ) : null}

            {/* Add to cart CTA */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isCartDisabled}
              aria-label={`${ctaLabel} — ${offer.title}`}
              className={cx(
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xs border text-[0.8rem] tracking-wide transition-all duration-300",
                isCartDisabled
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

  // CASE 2: Standard promotional link offer
  const innerContent = (
    <>
      {cardImage}
      <div className="flex flex-1 flex-col p-5">
        {cardText}

        {/* Pricing if provided */}
        {(effectivePrice > 0 || compareAtPrice !== null) ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
            {effectivePrice > 0 ? (
              <span className="text-[1.12rem] font-semibold text-forest">
                {formatPrice(effectivePrice, locale)}
              </span>
            ) : null}
            {compareAtPrice !== null && compareAtPrice > 0 ? (
              <span className="text-[0.82rem] text-ink-muted/80 line-through">
                {formatPrice(compareAtPrice, locale)}
              </span>
            ) : null}
            {hasDiscount ? (
              <span className="rounded-xs bg-gold/20 px-2 py-0.5 text-[0.66rem] font-medium text-forest-deep">
                {locale === "ar"
                  ? `وفّر ${formatPrice(discountSavings, locale)}`
                  : `Save ${formatPrice(discountSavings, locale)}`}
              </span>
            ) : null}
          </div>
        ) : null}

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
