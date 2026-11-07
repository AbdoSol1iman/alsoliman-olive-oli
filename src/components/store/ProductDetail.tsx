"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Check, Drop, Leaf, Truck } from "@/components/ui/Icons";
import { useAddToCart } from "@/lib/catalog-client";
import { cx, formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, Product, Variant } from "@/lib/products";

export function ProductDetail({
  product,
  locale,
  dict,
  initialVariantId,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
  initialVariantId?: string;
}) {
  const initial =
    product.variants.find((v) => v.id === initialVariantId) ?? product.variants[0];
  const [variant, setVariant] = useState<Variant>(initial);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const add = useAddToCart();

  const comingSoon = product.comingSoon;
  const soldOut = variant.stock !== null && variant.stock <= 0;
  const unavailable = comingSoon || soldOut;
  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const images = product.images;

  useEffect(() => {
    trackEvent("ViewContent", {
      productId: product.id,
      variantId: variant.id,
      value: variant.price,
    });
  }, [product.id, variant.id, variant.price]);

  const onAdd = () => {
    if (unavailable) return;
    add(product.id, variant.id, qty);
    trackEvent("AddToCart", {
      productId: product.id,
      variantId: variant.id,
      value: variant.price * qty,
      metadata: { qty },
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      {/* gallery */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="relative h-[clamp(420px,72vh,640px)] w-full overflow-hidden bg-cream/50">
          <div
            aria-hidden
            className="absolute inset-x-[14%] top-[8%] bottom-0 rounded-t-[999px] border border-gold/25"
          />
          <Image
            key={images[imageIndex].src}
            src={images[imageIndex].src}
            alt={locale === "ar" ? images[imageIndex].altAr : images[imageIndex].altEn}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 46vw"
            className="object-contain object-bottom p-[12%] pb-[2%]"
            style={{
              maskImage: "linear-gradient(to bottom, #000 95%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 95%, transparent 100%)",
            }}
          />
          {product.badgeAr ? (
            <span className="absolute start-4 top-4 rounded-xs border border-gold/40 bg-ivory/80 px-3 py-1 text-[0.62rem] tracking-[0.16em] text-forest backdrop-blur-sm">
              {locale === "ar" ? product.badgeAr : product.badgeEn}
            </span>
          ) : null}
        </div>

        {images.length > 1 ? (
        <div className="mt-3 flex gap-3">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setImageIndex(i)}
              aria-label={`${dict.product.details} ${i + 1}`}
              aria-current={imageIndex === i}
              className={cx(
                "relative size-20 overflow-hidden border bg-cream/50 transition-colors",
                imageIndex === i ? "border-gold" : "border-transparent hover:border-gold/40",
              )}
            >
              <Image
                src={img.src}
                alt=""
                fill
                sizes="80px"
                className="object-contain object-bottom p-2"
              />
            </button>
          ))}
        </div>
        ) : null}
      </div>

      {/* purchase panel */}
      <div>
        <div className="flex items-center gap-2 text-[0.62rem] tracking-[0.22em] text-gold">
          <span>{locale === "ar" ? product.categoryAr : product.categoryEn}</span>
          <span aria-hidden>·</span>
          <span>{locale === "ar" ? product.subtitleAr : product.subtitleEn}</span>
        </div>

        <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.9rem)]">{name}</h1>

        <p className="mt-4 max-w-lg text-[0.92rem] leading-8 text-ink-muted">
          {locale === "ar" ? product.hookAr : product.hookEn}
        </p>

        <div className="mt-7 flex items-end gap-3 border-b border-gold/20 pb-6">
          <span className="tnum text-[1.7rem] font-medium text-forest">
            {formatPrice(variant.price, locale)}
          </span>
          {variant.compareAt ? (
            <span className="tnum pb-1.5 text-[0.9rem] text-ink-muted line-through">
              {formatPrice(variant.compareAt, locale)}
            </span>
          ) : null}
          <span
            className={cx(
              "mb-2 ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem]",
              comingSoon
                ? "bg-gold/20 text-forest"
                : soldOut
                  ? "bg-forest/10 text-ink-muted"
                  : "bg-sage/25 text-forest",
            )}
          >
            <span
              aria-hidden
              className={cx(
                "size-1.5 rounded-full",
                comingSoon ? "bg-gold" : soldOut ? "bg-ink-muted" : "bg-sage-deep",
              )}
            />
            {comingSoon
              ? dict.common.comingSoon
              : soldOut
                ? dict.common.outOfStock
                : variant.stock !== null && variant.stock <= 5
                  ? dict.product.stockLeft.replace("{n}", String(variant.stock))
                  : dict.common.inStock}
          </span>
        </div>

        {product.sample ? (
          <p className="mt-4 text-[0.68rem] text-gold/90">{dict.product.sampleNotice}</p>
        ) : null}

        {comingSoon ? (
          <p className="mt-4 border border-gold/40 bg-gold/10 px-4 py-3 text-[0.78rem] leading-6 text-forest">
            {dict.product.comingSoonNotice}
          </p>
        ) : null}

        <fieldset className="mt-8">
          <legend className="mb-3 text-[0.7rem] tracking-[0.18em] text-ink-muted">
            {dict.product.size}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {product.variants.map((v) => {
              const disabled = v.stock !== null && v.stock <= 0;
              const active = v.id === variant.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setVariant(v);
                    setQty(1);
                  }}
                  aria-pressed={active}
                  className={cx(
                    "relative h-12 min-w-[5.5rem] border px-4 text-[0.82rem] transition-all duration-300",
                    active
                      ? "border-forest bg-forest text-ivory"
                      : "border-forest/20 text-forest hover:border-forest/60",
                    disabled && "cursor-not-allowed border-forest/10 text-ink-muted/40 line-through",
                  )}
                >
                  {locale === "ar" ? v.sizeLabelAr : v.sizeLabelEn}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          {!comingSoon ? (
            <div className="flex items-center gap-3">
              <span className="text-[0.7rem] tracking-[0.18em] text-ink-muted">
                {dict.product.quantity}
              </span>
              <QuantityStepper
                value={qty}
                max={variant.stock}
                onChange={setQty}
                label={dict.product.quantity}
              />
            </div>
          ) : null}
          <Button
            onClick={onAdd}
            disabled={unavailable}
            size="lg"
            className="flex-1"
            aria-live="polite"
          >
            {added ? <Check size={17} /> : null}
            {comingSoon
              ? dict.common.comingSoon
              : soldOut
                ? dict.common.outOfStock
                : added
                  ? dict.product.added
                  : dict.product.addToCart}
          </Button>
        </div>

        <div className="mt-8 space-y-4 border-t border-gold/20 pt-6 text-[0.8rem] leading-7 text-ink-muted">
          <div className="flex gap-3">
            <Truck size={18} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="font-medium text-forest">{dict.product.shippingTitle}</p>
              <p>{dict.product.shippingBody}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Drop size={18} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="font-medium text-forest">{dict.product.returnsTitle}</p>
              <p>{dict.product.returnsBody}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Leaf size={18} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="font-medium text-forest">{dict.product.storage}</p>
              <p>{locale === "ar" ? product.storageAr : product.storageEn}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border border-gold/20 bg-cream/30 p-5">
          <p className="text-[0.72rem] text-ink-muted">
            {dict.cart.shippingNote} ·{" "}
            <Link href={`/${locale}/shipping`} className="text-forest underline decoration-gold/50 underline-offset-4">
              {dict.product.tabsShipping}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
