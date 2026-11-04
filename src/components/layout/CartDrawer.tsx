"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Close, Trash } from "@/components/ui/Icons";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { WhatsAppCheckoutButton } from "@/components/store/WhatsAppCheckoutButton";
import { useCartLines } from "@/lib/catalog-client";
import { useCartStore } from "@/lib/cart-store";
import { useHydrated } from "@/lib/use-hydrated";
import { cx, formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

export function CartDrawer({
  locale,
  dict,
  whatsappNumber,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Effective WhatsApp Business number (settings → contact). */
  whatsappNumber: string;
}) {
  const open = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const lines = useCartLines();
  const mounted = useHydrated();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, close]);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const visible = mounted ? lines : [];

  return (
    <div
      className={cx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={dict.common.close}
        onClick={close}
        tabIndex={open ? 0 : -1}
        className={cx(
          "absolute inset-0 bg-forest-deep/45 backdrop-blur-sm transition-opacity duration-400",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={dict.cart.drawerTitle}
        className={cx(
          "absolute inset-y-0 end-0 flex w-full max-w-[27rem] flex-col bg-ivory shadow-lift transition-transform duration-500 ease-[var(--ease-out-soft)]",
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-gold/20 px-6 py-5">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-[1.4rem] text-forest">{dict.cart.drawerTitle}</h2>
            <span className="tnum text-[0.75rem] text-ink-muted">
              {mounted ? items.reduce((s, i) => s + i.qty, 0) : 0}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={dict.common.close}
            tabIndex={open ? 0 : -1}
            className="grid size-9 place-items-center rounded-full text-forest hover:bg-cream"
          >
            <Close size={19} />
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full border border-gold/30 text-gold">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
                <path d="M5.5 8h13l.9 11.2a1.6 1.6 0 0 1-1.6 1.8H6.2a1.6 1.6 0 0 1-1.6-1.8L5.5 8Z" />
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
              </svg>
            </span>
            <p className="font-display text-xl text-forest">{dict.cart.empty}</p>
            <p className="text-[0.85rem] text-ink-muted">{dict.cart.drawerEmpty}</p>
            <ButtonLink href={`/${locale}/shop`} size="sm" onClick={close} tabIndex={open ? 0 : -1}>
              {dict.cart.shopNow}
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gold/12 overflow-y-auto px-6">
              {visible.map((line) => (
                <li key={line.key} className="flex gap-4 py-5">
                  <Link
                    href={`/${locale}/product/${line.product.slug}?size=${line.variant.id}`}
                    onClick={close}
                    className="relative size-24 shrink-0 overflow-hidden rounded-xs bg-cream"
                  >
                    <Image
                      src={line.product.images[0].src}
                      alt={locale === "ar" ? line.product.images[0].altAr : line.product.images[0].altEn}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[0.9rem] font-medium text-charcoal">
                          {locale === "ar" ? line.product.nameAr : line.product.nameEn}
                        </p>
                        <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                          {locale === "ar" ? line.variant.sizeLabelAr : line.variant.sizeLabelEn}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.variant.id)}
                        aria-label={`${dict.cart.remove} — ${locale === "ar" ? line.product.nameAr : line.product.nameEn}`}
                        className="grid size-7 place-items-center rounded-full text-ink-muted transition-colors hover:bg-cream hover:text-forest"
                        tabIndex={open ? 0 : -1}
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <QuantityStepper
                        size="sm"
                        value={line.qty}
                        min={1}
                        max={line.maxQty}
                        onChange={(n) => setQty(line.variant.id, n)}
                        label={dict.cart.qty}
                      />
                      <span className="tnum text-[0.85rem] font-medium text-forest">
                        {formatPrice(line.lineTotal, locale)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-gold/20 bg-cream/40 px-6 pb-6 pt-5">
              <div className="flex items-center justify-between text-[0.9rem]">
                <span className="text-ink-muted">{dict.cart.subtotal}</span>
                <span className="tnum text-lg font-medium text-forest">
                  {formatPrice(subtotal, locale)}
                </span>
              </div>
              <p className="mt-1 text-[0.7rem] text-ink-muted">{dict.cart.shippingNote}</p>
              <div className="mt-4 flex flex-col gap-2">
                <WhatsAppCheckoutButton
                  locale={locale}
                  dict={dict}
                  whatsappNumber={whatsappNumber}
                  className="w-full"
                  tabIndex={open ? 0 : -1}
                />
                <ButtonLink
                  href={`/${locale}/checkout`}
                  variant="outline"
                  onClick={close}
                  size="lg"
                  className="w-full"
                >
                  {dict.cart.checkout}
                </ButtonLink>
                <Button variant="ghost" size="sm" onClick={close} className="w-full" tabIndex={open ? 0 : -1}>
                  {dict.cart.continue}
                </Button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
