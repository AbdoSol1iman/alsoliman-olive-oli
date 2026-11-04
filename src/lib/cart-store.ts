"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartEntry = {
  productId: string;
  variantId: string;
  qty: number;
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

/**
 * The cart holds only ids + quantities. Product lookups (prices, stock caps)
 * resolve against the catalog provided by `CatalogProvider`, so the client
 * bundle never embeds the product database.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (productId, variantId, qty = 1) => {
        const existing = get().items.find((i) => i.variantId === variantId);
        const nextQty = (existing?.qty ?? 0) + qty;
        if (nextQty <= 0) return;
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
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.variantId !== variantId) });
          return;
        }
        set({ items: get().items.map((i) => (i.variantId === variantId ? { ...i, qty } : i)) });
      },
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: "alsuliman-cart",
      version: 2,
      // only the line items survive a refresh — never the drawer state
      partialize: (state) => ({ items: state.items }) as unknown as CartState,
    },
  ),
);

export const useCartCount = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
