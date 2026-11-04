"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowEnd, Check, Plus } from "@/components/ui/Icons";
import { useCartStore } from "@/lib/cart-store";
import { useAddToCart } from "@/lib/catalog-client";
import { cx, formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { ListingItem, Locale } from "@/lib/products";

const panelTone = (ml: number) =>
  ml <= 500 ? "bg-cream/75" : ml <= 750 ? "bg-sage/20" : "bg-gold-pale/30";

export function ProductCard({
  item,
  locale,
  dict,
  priority = false,
}: {
  item: ListingItem;
  locale: Locale;
  dict: Dictionary;
  priority?: boolean;
}) {
  const { product, variant } = item;
  const add = useAddToCart();
  const openCart = useCartStore((s) => s.open);
  const [justAdded, setJustAdded] = useState(false);
  const href = `/${locale}/product/${product.slug}?size=${variant.id}`;
  const soldOut = variant.stock !== null && variant.stock <= 0;
  const low =
    variant.stock !== null &&
    variant.stock > 0 &&
    variant.stock <= (product.lowStockThreshold || 5);
  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const size = locale === "ar" ? variant.sizeLabelAr : variant.sizeLabelEn;

  const onQuickAdd = () => {
    add(product.id, variant.id, 1);
    openCart();
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <article className="group flex flex-col">
      <Link
        href={href}
        aria-label={`${name} — ${size}`}
        className="relative block overflow-hidden rounded-xs"
      >
        <div className={cx("relative aspect-[4/5] w-full", panelTone(variant.ml))}>
          <div
            aria-hidden
            className="absolute inset-x-[14%] top-[9%] bottom-0 rounded-t-[999px] border border-gold/25 transition-colors duration-500 group-hover:border-gold/45"
          />
          <Image
            src={product.images[0].src}
            alt={locale === "ar" ? product.images[0].altAr : product.images[0].altEn}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 28vw"
            className={cx(
              "object-contain object-bottom p-[13%] pb-[3%] transition-transform duration-[900ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.035]",
              soldOut && "opacity-55 grayscale-[0.4]",
            )}
            style={{
              maskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
            }}
          />

          <span className="absolute start-3 top-3 inline-flex items-center rounded-xs border border-forest/10 bg-ivory/70 px-2.5 py-1 text-[0.62rem] tracking-[0.12em] text-forest backdrop-blur-sm">
            {size}
          </span>

          {soldOut ? (
            <span className="absolute end-3 top-3 rounded-xs bg-forest/90 px-2.5 py-1 text-[0.6rem] text-ivory">
              {dict.common.outOfStock}
            </span>
          ) : low ? (
            <span className="absolute end-3 top-3 rounded-xs bg-gold/90 px-2.5 py-1 text-[0.6rem] text-forest-deep">
              {dict.common.lowStock}
            </span>
          ) : null}

          <span
            aria-hidden
            className="absolute bottom-3 end-3 grid size-9 translate-y-2 place-items-center rounded-full bg-ivory/85 text-forest opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <ArrowEnd size={15} className="rtl:rotate-180" />
          </span>
        </div>
      </Link>

      <div className="mt-4 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[0.6rem] tracking-[0.22em] text-gold">
            {locale === "ar" ? product.categoryAr : product.categoryEn}
          </p>
          <h3 className="mt-1.5 text-[1.08rem] leading-snug sm:text-[1.2rem]">
            <Link href={href} className="transition-colors hover:text-olive">
              {name}
            </Link>
          </h3>
          <p className="mt-0.5 text-[0.74rem] text-ink-muted">
            {locale === "ar" ? product.subtitleAr : product.subtitleEn}
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 sm:block sm:text-end">
          <span className="tnum block text-[1.02rem] font-medium text-forest">
            {formatPrice(variant.price, locale)}
          </span>
          {variant.compareAt ? (
            <span className="tnum block text-[0.72rem] text-ink-muted line-through">
              {formatPrice(variant.compareAt, locale)}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onQuickAdd}
        disabled={soldOut}
        aria-label={`${dict.common.addToCart} — ${name} ${size}`}
        className={cx(
          "mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xs border text-[0.8rem] tracking-wide transition-all duration-300",
          soldOut
            ? "cursor-not-allowed border-forest/12 text-ink-muted/50"
            : justAdded
              ? "border-forest bg-forest text-ivory"
              : "border-forest/20 text-forest hover:border-forest hover:bg-forest hover:text-ivory",
        )}
      >
        {justAdded ? <Check size={15} /> : <Plus size={15} />}
        {soldOut ? dict.common.outOfStock : justAdded ? dict.common.added : dict.common.addToCart}
      </button>
    </article>
  );
}
