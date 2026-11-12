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
  offerTitle?: string;
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
      items.flatMap((entry) => {
        // Resolve by variant id, not the stored product id: carts created
        // before the size split still carry the old product id, but the
        // variant id is globally unique and always points at its new product.
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
        const price =
          typeof entry.unitPrice === "number" && entry.unitPrice >= 0
            ? entry.unitPrice
            : variant.price;
        const lineKey =
          entry.key ||
          `${product.id}:${variant.id}${entry.unitPrice !== undefined ? `:${entry.unitPrice}` : ""}`;
        return [
          {
            ...entry,
            qty,
            key: lineKey,
            product,
            variant,
            unitPrice: price,
            image: getVariantImage(product, variant),
            lineTotal: price * qty,
            maxQty: variant.stock,
            offerTitle: entry.offerTitle,
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
  return (
    _productId: string,
    variantId: string,
    qty = 1,
    unitPrice?: number,
    offerTitle?: string,
  ) => {
    // Variant-first lookup: the variant id is globally unique, so a stale
    // product id (e.g. an old link or a pre-split cart) still resolves.
    const product = products.find(
      (p) =>
        p.active &&
        !p.comingSoon &&
        p.variants.some((v) => v.id === variantId),
    );
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) return;
    const state = useCartStore.getState();
    const itemKey =
      unitPrice !== undefined ? `${variantId}:${unitPrice}` : variantId;
    const current =
      state.items.find(
        (i) =>
          (i.key ||
            (i.unitPrice !== undefined
              ? `${i.variantId}:${i.unitPrice}`
              : i.variantId)) === itemKey,
      )?.qty ?? 0;
    const next = clampQty(current + qty, variant.stock);
    if (next <= 0 || next === current) return;
    state.add(product.id, variantId, next - current, unitPrice, offerTitle);
  };
}
