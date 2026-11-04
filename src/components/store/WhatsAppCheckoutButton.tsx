"use client";

import { useMemo } from "react";
import { Whatsapp } from "@/components/ui/Icons";
import { useCartLines } from "@/lib/catalog-client";
import { buildOrderWhatsAppMessage, whatsappOrderHref } from "@/lib/whatsapp";
import { cx } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

/**
 * Primary cart CTA: opens WhatsApp Business with the complete order
 * (products, quantities, unit prices, totals) pre-filled as a message.
 *
 * Business rules:
 *  - Prices come from the server catalog via `useCartLines()` — never
 *    user-editable values.
 *  - The cart is intentionally NOT cleared: the order only exists once the
 *    shop and the customer confirm it inside the WhatsApp conversation, and
 *    the cart must survive the customer coming back without finishing.
 *  - Renders nothing when the cart is empty or WhatsApp is unconfigured, so
 *    checkout can never be initiated without items.
 */
export function WhatsAppCheckoutButton({
  locale,
  dict,
  whatsappNumber,
  size = "lg",
  tabIndex,
  className,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Effective WhatsApp Business number (settings → contact). */
  whatsappNumber: string;
  size?: "md" | "lg";
  tabIndex?: number;
  className?: string;
}) {
  const lines = useCartLines();

  const href = useMemo(() => {
    if (!whatsappNumber || lines.length === 0) return null;
    const items = lines.map((line) => ({
      name: locale === "ar" ? line.product.nameAr : line.product.nameEn,
      size: locale === "ar" ? line.variant.sizeLabelAr : line.variant.sizeLabelEn,
      qty: line.qty,
      unitPrice: line.variant.price,
      lineTotal: line.lineTotal,
    }));
    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    return whatsappOrderHref(whatsappNumber, buildOrderWhatsAppMessage(items, total, locale));
  }, [lines, whatsappNumber, locale]);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      data-testid="whatsapp-checkout"
      tabIndex={tabIndex}
      className={cx(
        "group/wa relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xs",
        "font-medium tracking-wide transition-[background-color,border-color,color,transform] duration-300",
        "ease-[var(--ease-out-soft)] active:translate-y-px",
        "border border-forest bg-forest text-ivory hover:border-forest-deep hover:bg-forest-deep",
        size === "lg" ? "h-[3.4rem] px-9 text-[0.95rem]" : "h-12 px-7 text-[0.9rem]",
        className,
      )}
    >
      <span className="text-gold-pale transition-transform duration-300 group-hover/wa:scale-110">
        <Whatsapp size={size === "lg" ? 19 : 17} />
      </span>
      {dict.cart.whatsappCheckout}
    </a>
  );
}
