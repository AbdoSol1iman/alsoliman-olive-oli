"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo } from "react";
import { products, type Product, type Variant } from "./products";

export type CartEntry = {
  productId: string;
  variantId: string;
  qty: number;
};

export type CartLine = CartEntry & {
  key: string;
  product: Product;
  variant: Variant;
  lineTotal: number;
  maxQty: number | null;
};

type CartState = {
  items: CartEntry[];
  isOpen: boolean;
  add: (productId: string, variantId: string, qty?: number) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const clampQty = (qty: number, stock: number | null) => {
  const min = 1;
  if (stock === null || stock === undefined) return Math.max(min, qty);
  if (stock <= 0) return 0;
  return Math.min(Math.max(min, qty), stock);
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (productId, variantId, qty = 1) => {
        const product = products.find((p) => p.id === productId);
        const variant = product?.variants.find((v) => v.id === variantId);
        if (!product || !variant) return;
        const existing = get().items.find((i) => i.variantId === variantId);
        const nextQty = clampQty((existing?.qty ?? 0) + qty, variant.stock);
        if (nextQty === 0) return;
        set({
          items: existing
            ? get().items.map((i) => (i.variantId === variantId ? { ...i, qty: nextQty } : i))
            : [...get().items, { productId, variantId, qty: nextQty }],
          isOpen: true,
        });
      },
      remove: (variantId) =>
        set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      setQty: (variantId, qty) => {
        const product = products.find((p) => p.variants.some((v) => v.id === variantId));
        const variant = product?.variants.find((v) => v.id === variantId);
        if (!variant) return;
        const next = clampQty(qty, variant.stock);
        if (next === 0) {
          set({ items: get().items.filter((i) => i.variantId !== variantId) });
          return;
        }
        set({ items: get().items.map((i) => (i.variantId === variantId ? { ...i, qty: next } : i)) });
      },
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: "alsuliman-cart",
      version: 1,
      // only the line items survive a refresh — never the drawer state
      partialize: (state) => ({ items: state.items }) as unknown as CartState,
    },
  ),
);

export const useCartLines = (): CartLine[] => {
  const items = useCartStore((s) => s.items);
  return useMemo(
    () =>
      items.flatMap((entry) => {
        const product = products.find((p) => p.id === entry.productId);
        const variant = product?.variants.find((v) => v.id === entry.variantId);
        if (!product || !variant) return [];
        return [{
          ...entry,
          key: `${entry.productId}:${entry.variantId}`,
          product,
          variant,
          lineTotal: variant.price * entry.qty,
          maxQty: variant.stock,
        }];
      }),
    [items],
  );
};

export const useCartCount = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));

export const useCartSubtotal = () =>
  useCartLines().reduce((sum, l) => sum + l.lineTotal, 0);
