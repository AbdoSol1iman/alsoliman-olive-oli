"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartEntry = {
  key?: string;
  productId: string;
  variantId: string;
  qty: number;
  unitPrice?: number;
  offerTitle?: string;
};

type CartState = {
  items: CartEntry[];
  isOpen: boolean;
  add: (
    productId: string,
    variantId: string,
    qty?: number,
    unitPrice?: number,
    offerTitle?: string,
  ) => void;
  remove: (keyOrVariantId: string) => void;
  setQty: (keyOrVariantId: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

/**
 * The cart holds item ids, quantities, and optional offer price overrides.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (productId, variantId, qty = 1, unitPrice?: number, offerTitle?: string) => {
        const itemKey =
          unitPrice !== undefined ? `${variantId}:${unitPrice}` : variantId;
        const existing = get().items.find(
          (i) =>
            (i.key ||
              (i.unitPrice !== undefined
                ? `${i.variantId}:${i.unitPrice}`
                : i.variantId)) === itemKey,
        );
        const nextQty = (existing?.qty ?? 0) + qty;
        if (nextQty <= 0) return;
        set({
          items: existing
            ? get().items.map((i) =>
                (i.key ||
                  (i.unitPrice !== undefined
                    ? `${i.variantId}:${i.unitPrice}`
                    : i.variantId)) === itemKey
                  ? { ...i, qty: nextQty }
                  : i,
              )
            : [
                ...get().items,
                {
                  key: itemKey,
                  productId,
                  variantId,
                  qty: nextQty,
                  unitPrice,
                  offerTitle,
                },
              ],
          isOpen: true,
        });
      },
      remove: (keyOrVariantId) =>
        set({
          items: get().items.filter(
            (i) =>
              i.key !== keyOrVariantId &&
              i.variantId !== keyOrVariantId &&
              `${i.variantId}:${i.unitPrice}` !== keyOrVariantId,
          ),
        }),
      setQty: (keyOrVariantId, qty) => {
        if (qty <= 0) {
          get().remove(keyOrVariantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.key === keyOrVariantId ||
            i.variantId === keyOrVariantId ||
            `${i.variantId}:${i.unitPrice}` === keyOrVariantId
              ? { ...i, qty }
              : i,
          ),
        });
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
