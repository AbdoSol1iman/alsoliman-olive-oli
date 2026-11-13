"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCartStore, type CartEntry } from "./cart-store";
import { getVariantImage, type Product, type ProductImage, type Variant } from "./products";

/**
 * Client-side view of the catalog, hydrated from the server (which reads the
 * database). Components that need product data — the cart, checkout summary,
 * quick-add — resolve through this provider, so the client bundle never
 * embeds a hardcoded product list.
 */
const CatalogContext = createContext<{ products: Product[] }>({ products: [] });

export function CatalogProvider({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  const value = useMemo(() => ({ products }), [products]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalogProducts = () => useContext(CatalogContext).products;

export type CartLine = CartEntry & {
  key: string;
  product: Product;
  variant: Variant;
  /** This size's own image, or the product gallery fallback. */
  image: ProductImage;
  unitPrice: number;
  lineTotal: number;
  maxQty: number | null;
};

const clampQty = (qty: number, stock: number | null) => {
  const min = 1;
  if (stock === null || stock === undefined) return Math.max(min, qty);
  if (stock <= 0) return 0;
  return Math.min(Math.max(min, qty), stock);
};

/** Resolves cart entries against the live catalog, dropping unavailable lines. */
export const useCartLines = (): CartLine[] => {
  const items = useCartStore((s) => s.items);
  const products = useCatalogProducts();

  return useMemo(
    () =>
      items.flatMap((entry): CartLine[] => {
        if (entry.isOffer && entry.offer) {
          const offer = entry.offer;
          const lineKey = entry.key || `offer:${offer.id || offer.title}`;
          const price = Number(offer.price) || 0;
          let maxQty: number | null = null;
          if (Array.isArray(offer.productIds) && offer.productIds.length > 0) {
            for (const id of offer.productIds) {
              const p = products.find(
                (prod) =>
                  prod.variants.some((v) => v.id === id) || prod.id === id,
              );
              const v = p?.variants.find((v) => v.id === id) || p?.variants[0];
              if (v && v.stock !== null) {
                maxQty = maxQty === null ? v.stock : Math.min(maxQty, v.stock);
              }
            }
          }
          const qty = clampQty(entry.qty, maxQty);
          if (qty === 0) return [];

          const offerImg = offer.image || "/products/bottle-cutout.png";
          const titleAr = offer.titleAr || offer.title;
          const titleEn = offer.titleEn || offer.title;
          const subtitleAr =
            offer.subtitleAr || offer.subtitle || "عرض خاص";
          const subtitleEn =
            offer.subtitleEn || offer.subtitle || "Special Offer";

          return [
            {
              ...entry,
              isOffer: true,
              qty,
              key: lineKey,
              unitPrice: price,
              lineTotal: price * qty,
              maxQty,
              product: {
                id: "offer",
                slug: "offer",
                categoryId: null,
                nameAr: titleAr,
                nameEn: titleEn,
                subtitleAr: subtitleAr,
                subtitleEn: subtitleEn,
                categoryAr: "",
                categoryEn: "",
                hookAr: "",
                hookEn: "",
                descriptionAr: [subtitleAr],
                descriptionEn: [subtitleEn],
                images: [{ src: offerImg, altAr: titleAr, altEn: titleEn }],
                variants: [],
                specs: [],
                storageAr: "",
                storageEn: "",
                badgeAr: null,
                badgeEn: null,
                active: true,
                comingSoon: false,
                featured: false,
                sortOrder: 0,
                sample: false,
                lowStockThreshold: 0,
                familySlug: "offer",
              },
              variant: {
                id: lineKey,
                sizeLabelAr: subtitleAr,
                sizeLabelEn: subtitleEn,
                ml: 0,
                price,
                compareAt: null,
                stock: maxQty,
                cost: 0,
                sku: "OFFER",
                images: [{ src: offerImg, altAr: titleAr, altEn: titleEn }],
              },
              image: { src: offerImg, altAr: titleAr, altEn: titleEn },
            },
          ];
        }

        // Resolve standard catalog products by variant id
        const product = products.find(
          (p) =>
            p.active &&
            !p.comingSoon &&
            p.variants.some((v) => v.id === entry.variantId),
        );
        const variant = product?.variants.find((v) => v.id === entry.variantId);
        if (!product || !variant) return [];
        const qty = clampQty(entry.qty, variant.stock);
        if (qty === 0) return [];
        const price = variant.price;
        const lineKey = `${product.id}:${variant.id}`;
        return [
          {
            ...entry,
            isOffer: false,
            qty,
            key: lineKey,
            product,
            variant,
            unitPrice: price,
            image: getVariantImage(product, variant),
            lineTotal: price * qty,
            maxQty: variant.stock,
          },
        ];
      }),
    [items, products],
  );
};

export const useCartSubtotal = () =>
  useCartLines().reduce((sum, l) => sum + l.lineTotal, 0);

/** Add-to-cart with server-catalog stock clamping. */
export function useAddToCart() {
  const products = useCatalogProducts();
  return (productId: string, variantId: string, qty = 1) => {
    const product = products.find(
      (p) =>
        p.active &&
        !p.comingSoon &&
        p.variants.some((v) => v.id === variantId),
    );
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) return;
    const state = useCartStore.getState();
    const current = state.items.find((i) => !i.isOffer && i.variantId === variantId)?.qty ?? 0;
    const next = clampQty(current + qty, variant.stock);
    if (next <= 0 || next === current) return;
    state.add(product.id, variantId, next - current);
  };
}
