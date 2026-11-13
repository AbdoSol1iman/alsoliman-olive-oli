"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartOffer = {
  id: string;
  title: string;
  titleAr?: string;
  titleEn?: string;
  subtitle?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  price: number;
  image?: string;
  productIds?: string[];
};

export type CartEntry = {
  key?: string;
  isOffer?: boolean;
  productId: string;
  variantId: string;
  qty: number;
  offer?: CartOffer;
};

type CartState = {
  items: CartEntry[];
  isOpen: boolean;
  add: (productId: string, variantId: string, qty?: number) => void;
  addOffer: (offer: CartOffer, qty?: number) => void;
  remove: (keyOrVariantId: string) => void;
  setQty: (keyOrVariantId: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

/**
 * The cart holds item ids, quantities, and offer bundles. Prices for standard
 * catalog products are always authoritative from live catalog variant prices.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (productId, variantId, qty = 1) => {
        const existing = get().items.find(
          (i) => !i.isOffer && (i.variantId === variantId || i.key === variantId),
        );
        const nextQty = (existing?.qty ?? 0) + qty;
        if (nextQty <= 0) return;
        set({
          items: existing
            ? get().items.map((i) =>
                !i.isOffer && (i.variantId === variantId || i.key === variantId)
                  ? { ...i, qty: nextQty }
                  : i,
              )
            : [
                ...get().items,
                {
                  key: variantId,
                  isOffer: false,
                  productId,
                  variantId,
                  qty: nextQty,
                },
              ],
          isOpen: true,
        });
      },
      addOffer: (offer, qty = 1) => {
        const offerKey = `offer:${offer.id || offer.title}`;
        const existing = get().items.find(
          (i) => i.isOffer && (i.key === offerKey || i.variantId === offerKey),
        );
        const nextQty = (existing?.qty ?? 0) + qty;
        if (nextQty <= 0) return;
        set({
          items: existing
            ? get().items.map((i) =>
                i.isOffer && (i.key === offerKey || i.variantId === offerKey)
                  ? { ...i, qty: nextQty }
                  : i,
              )
            : [
                ...get().items,
                {
                  key: offerKey,
                  isOffer: true,
                  productId: "offer",
                  variantId: offerKey,
                  qty: nextQty,
                  offer,
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
              `${i.productId}:${i.variantId}` !== keyOrVariantId,
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
            `${i.productId}:${i.variantId}` === keyOrVariantId
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
      partialize: (state) => ({ items: state.items }) as unknown as CartState,
    },
  ),
);

export const useCartCount = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
