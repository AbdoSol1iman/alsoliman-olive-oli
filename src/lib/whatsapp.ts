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

/** Everything the shop needs from a placed order, already resolved server-side. */
export type ConfirmedOrder = {
  reference: string;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string | null;
  payment: "cod" | "instapay";
  items: WhatsAppOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
};

/**
 * The message a customer sends to the shop right after placing an order.
 * Built from the *stored* order (server-side), never from client state, so the
 * reference, line prices and totals always match what the shop dashboard shows.
 */
export function buildConfirmedOrderMessage(order: ConfirmedOrder, locale: Locale): string {
  const itemLines = order.items.flatMap((item, index) => [
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

  const paymentLabel =
    order.payment === "instapay"
      ? locale === "ar"
        ? "إنستاباي"
        : "InstaPay"
      : locale === "ar"
        ? "الدفع عند الاستلام"
        : "Cash on delivery";

  const notes = order.notes?.trim();

  const lines =
    locale === "ar"
      ? [
          "مرحباً، تم تسجيل طلبي على موقع آل سليمان:",
          "",
          `🧾 رقم الطلب: ${order.reference}`,
          `👤 الاسم: ${order.customerName}`,
          `📞 الهاتف: ${order.phone}`,
          `📍 العنوان: ${order.governorate} — ${order.city}`,
          `   ${order.address}`,
          "",
          "🛒 تفاصيل الطلب:",
          "",
          ...itemLines,
          "----------------------",
          `المجموع الفرعي: ${money(order.subtotal, locale)}`,
          `الشحن: ${money(order.shipping, locale)}`,
          `الإجمالي: ${money(order.total, locale)}`,
          "",
          `💳 طريقة الدفع: ${paymentLabel}`,
          ...(notes ? [`📝 ملاحظات: ${notes}`] : []),
          "",
          "أرجو تأكيد الطلب وتوضيح تفاصيل التوصيل.",
        ]
      : [
          "Hello, I have just placed this order on Alsuliman Olive Oil:",
          "",
          `🧾 Order reference: ${order.reference}`,
          `👤 Name: ${order.customerName}`,
          `📞 Phone: ${order.phone}`,
          `📍 Address: ${order.governorate} — ${order.city}`,
          `   ${order.address}`,
          "",
          "🛒 Order details:",
          "",
          ...itemLines,
          "----------------------",
          `Subtotal: ${money(order.subtotal, locale)}`,
          `Shipping: ${money(order.shipping, locale)}`,
          `Total: ${money(order.total, locale)}`,
          "",
          `💳 Payment: ${paymentLabel}`,
          ...(notes ? [`📝 Notes: ${notes}`] : []),
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
