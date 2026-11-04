import type { Locale } from "./products";

/**
 * WhatsApp checkout helpers.
 *
 * The order message is built from resolved cart lines (product data hydrated
 * from the database via `CatalogProvider`), so names, prices and totals are
 * always the live catalog values — never something the client invented.
 */

/** One cart line as it appears in the WhatsApp order message. */
export type WhatsAppOrderItem = {
  name: string;
  size: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

const digits = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Egyptian pound inside the message: "350 جنيه" (AR) / "EGP 350" (EN). */
const money = (value: number, locale: Locale) => {
  const n = digits.format(Math.round(value));
  return locale === "ar" ? `${n} جنيه` : `EGP ${n}`;
};

/**
 * Builds the WhatsApp order message from the cart contents.
 *
 * Format (AR) — matches the requested template:
 *
 *   مرحباً، أريد تأكيد الطلب التالي من متجر الزيتون:
 *
 *   🛒 تفاصيل الطلب:
 *
 *   1. زيت زيتون بكر ممتاز (٥٠٠ مل)
 *      الكمية: 2
 *      سعر الوحدة: 235 جنيه
 *      الإجمالي: 470 جنيه
 *
 *   ----------------------
 *   إجمالي الطلب: 470 جنيه
 *
 *   أرجو تأكيد الطلب وتوضيح تفاصيل التوصيل.
 */
export function buildOrderWhatsAppMessage(
  items: WhatsAppOrderItem[],
  total: number,
  locale: Locale,
): string {
  const detailLines = items.flatMap((item, index) => [
    `${index + 1}. ${item.name} (${item.size})`,
    locale === "ar" ? `   الكمية: ${item.qty}` : `   Qty: ${item.qty}`,
    locale === "ar"
      ? `   سعر الوحدة: ${money(item.unitPrice, locale)}`
      : `   Unit price: ${money(item.unitPrice, locale)}`,
    locale === "ar"
      ? `   الإجمالي: ${money(item.lineTotal, locale)}`
      : `   Line total: ${money(item.lineTotal, locale)}`,
    "",
  ]);

  const lines =
    locale === "ar"
      ? [
          "مرحباً، أريد تأكيد الطلب التالي من متجر الزيتون:",
          "",
          "🛒 تفاصيل الطلب:",
          "",
          ...detailLines,
          "----------------------",
          `إجمالي الطلب: ${money(total, locale)}`,
          "",
          "أرجو تأكيد الطلب وتوضيح تفاصيل التوصيل.",
        ]
      : [
          "Hello, I would like to confirm the following order from Alsuliman Olive Oil:",
          "",
          "🛒 Order details:",
          "",
          ...detailLines,
          "----------------------",
          `Order total: ${money(total, locale)}`,
          "",
          "Please confirm the order and share the delivery details.",
        ];

  return lines.join("\n");
}

/**
 * `https://wa.me/<digits>?text=<url-encoded message>` — the number is stripped
 * to digits only so `+20…` / spaces from the settings screen still produce a
 * valid WhatsApp link.
 */
export function whatsappOrderHref(number: string, message: string): string {
  const digitsOnly = number.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
