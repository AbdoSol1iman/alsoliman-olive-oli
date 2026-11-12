import type { OrderStatus } from "./orders";

/**
 * Order status labels and display order.
 *
 * Kept in a server-safe module (no `"use client"`) because both server pages
 * (orders list, order detail, invoice) and client components (status form,
 * badges) need them. Importing a plain object from a `"use client"` module
 * into a server component yields a client reference, not the object — the
 * labels rendered empty in the admin orders filter and the invoice.
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

/** Ordered for the status picker: the normal fulfilment flow first. */
export const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
