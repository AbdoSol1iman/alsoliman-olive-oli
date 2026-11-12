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
      items.flatMap((entry) => {
        const product = products.find(
          (p) => p.id === entry.productId && p.active && !p.comingSoon,
        );
        const variant = product?.variants.find((v) => v.id === entry.variantId);
        if (!product || !variant) return [];
        const qty = clampQty(entry.qty, variant.stock);
        if (qty === 0) return [];
        return [{
          ...entry,
          qty,
          key: `${entry.productId}:${entry.variantId}`,
          product,
          variant,
          image: getVariantImage(product, variant),
          lineTotal: variant.price * qty,
          maxQty: variant.stock,
        }];
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
      (p) => p.id === productId && p.active && !p.comingSoon,
    );
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) return;
    const state = useCartStore.getState();
    const current = state.items.find((i) => i.variantId === variantId)?.qty ?? 0;
    const next = clampQty(current + qty, variant.stock);
    if (next <= 0 || next === current) return;
    state.add(productId, variantId, next - current);
  };
}
