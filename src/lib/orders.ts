import "server-only";
import { updateTag } from "next/cache";
import { getDb } from "./db";
import { readCatalogData, CATALOG_TAG } from "./catalog";
import { readSettingsSync, shippingFeeFor, isFreeCity, isWholesale } from "./settings";
import { checkoutSchema } from "./checkout-schema";
import { randomUUID } from "node:crypto";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const isOrderStatus = (v: string): v is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(v);

export type OrderRecord = {
  id: string;
  reference: string;
  created_at: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  notes: string | null;
  payment_method: "cod" | "instapay";
  subtotal: number;
  shipping: number;
  total: number;
  updated_at: string | null;
};

export type OrderItem = {
  product_id: string;
  variant_id: string;
  name_ar: string;
  name_en: string;
  size_ar: string;
  size_en: string;
  unit_price: number;
  qty: number;
};

export type OrderNote = {
  id: string;
  order_id: string;
  body: string;
  author: string;
  created_at: string;
};

const makeReference = () => {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SLM-${stamp}-${rand}`;
};

export function createOrder(raw: unknown): { ok: true; reference: string } | { ok: false; code: string } {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: parsed.error.issues[0]?.message ?? "invalid_input" };
  }
  const input = parsed.data;
  const db = getDb();

  // Re-price on the server — never trust client totals. Fresh reads (not the
  // cached catalog) so a just-edited price is always what gets charged.
  const { products } = readCatalogData();
  const settings = readSettingsSync();

  // The zone list is owner-editable — validate against the live settings.
  if (!(input.governorate in settings.shipping.zones)) {
    return { ok: false, code: "invalid_zone" };
  }

  const lines = input.items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId && p.active);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) return [];
    if (variant.stock !== null && variant.stock < item.qty) return [];
    return [{
      productId: product.id,
      variantId: variant.id,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      sizeAr: variant.sizeLabelAr,
      sizeEn: variant.sizeLabelEn,
      unitPrice: variant.price,
      qty: item.qty,
    }];
  });

  if (lines.length !== input.items.length) {
    console.log("[order] unavailable", JSON.stringify(input.items), lines.length);
    return { ok: false, code: "unavailable" };
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const fee = shippingFeeFor(settings, {
    governorate: input.governorate,
    city: input.city,
    totalQty,
    subtotal,
  });
  const total = subtotal + fee;

  const existing = db
    .prepare("SELECT reference FROM orders WHERE idempotency_key = ?")
    .get(input.idempotencyKey) as { reference: string } | undefined;
  if (existing) return { ok: true, reference: existing.reference };

  const id = randomUUID();
  const reference = makeReference();
  const now = new Date().toISOString();

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO orders (id, reference, created_at, status, customer_name, phone, governorate, city, address, notes, payment_method, subtotal, shipping, total, idempotency_key, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      reference,
      now,
      input.fullName,
      input.phone,
      input.governorate,
      input.city,
      input.address,
      input.notes || null,
      input.payment,
      subtotal,
      fee,
      total,
      input.idempotencyKey,
      now,
    );

    const itemStmt = db.prepare(
      `INSERT INTO order_items (order_id, product_id, variant_id, name_ar, name_en, size_ar, size_en, unit_price, qty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of lines) {
      itemStmt.run(id, l.productId, l.variantId, l.nameAr, l.nameEn, l.sizeAr, l.sizeEn, l.unitPrice, l.qty);
    }
  });

  insert();

  // A sale changes stock and best-seller data — refresh the storefront cache.
  // (createOrder only ever runs inside a server action, where updateTag is valid.)
  updateTag(CATALOG_TAG);

  return { ok: true, reference };
}

export function getOrderByReference(reference: string) {
  const db = getDb();
  const order = db
    .prepare("SELECT * FROM orders WHERE reference = ?")
    .get(reference.toUpperCase()) as OrderRecord | undefined;
  if (!order) return null;
  const items = db
    .prepare(
      "SELECT product_id, variant_id, name_ar, name_en, size_ar, size_en, unit_price, qty FROM order_items WHERE order_id = ?",
    )
    .all(order.id) as OrderItem[];
  return { order, items };
}

export function getOrderById(id: string) {
  return getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRecord | undefined;
}

/* ------------------------------------------------------------------ */
/* Listing / search / filters                                           */
/* ------------------------------------------------------------------ */

export type OrderQuery = {
  status?: string;
  /** Matches reference, customer name or phone (loosely). */
  q?: string;
  /** ISO date (yyyy-mm-dd) bounds on created_at. */
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export function listOrders(query: OrderQuery = {}): OrderRecord[] {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (query.status && isOrderStatus(query.status)) {
    where.push("status = ?");
    params.push(query.status);
  }
  const q = (query.q ?? "").trim();
  if (q) {
    where.push("(reference LIKE ? OR customer_name LIKE ? OR phone LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (query.from) {
    where.push("created_at >= ?");
    params.push(query.from);
  }
  if (query.to) {
    // inclusive end-of-day
    where.push("created_at <= ?");
    params.push(`${query.to}T23:59:59.999Z`);
  }

  const sql = `SELECT * FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(Math.min(query.limit ?? 100, 1000), query.offset ?? 0);
  return db.prepare(sql).all(...params) as OrderRecord[];
}

export function countOrders(query: OrderQuery = {}) {
  const { limit: _l, offset: _o, ...rest } = query;
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (rest.status && isOrderStatus(rest.status)) {
    where.push("status = ?");
    params.push(rest.status);
  }
  const q = (rest.q ?? "").trim();
  if (q) {
    where.push("(reference LIKE ? OR customer_name LIKE ? OR phone LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (rest.from) {
    where.push("created_at >= ?");
    params.push(rest.from);
  }
  if (rest.to) {
    where.push("created_at <= ?");
    params.push(`${rest.to}T23:59:59.999Z`);
  }
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`)
    .get(...params) as { n: number };
  return row.n;
}

/* ------------------------------------------------------------------ */
/* Dashboard statistics                                                 */
/* ------------------------------------------------------------------ */

export type SalesPoint = { label: string; date: string; orders: number; revenue: number };

export type DashboardStats = {
  revenue: number;
  orders: number;
  pending: number;
  processing: number;
  delivered: number;
  cancelled: number;
  averageOrder: number;
  products: number;
  lowStock: { product: string; variant: string; sku: string; stock: number; threshold: number }[];
  recentOrders: OrderRecord[];
  bestSellers: { productId: string; variantId: string; name: string; size: string; qty: number; revenue: number }[];
  series: { daily: SalesPoint[]; weekly: SalesPoint[]; monthly: SalesPoint[] };
  revenueByDay: SalesPoint[];
};

export function orderStats(): DashboardStats {
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS orders,
         COALESCE(SUM(total), 0) AS revenue,
         COALESCE(AVG(total), 0) AS avg_order
       FROM orders`,
    )
    .get() as { orders: number; revenue: number; avg_order: number };

  const byStatus = db
    .prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status")
    .all() as { status: string; n: number }[];
  const statusCount = (s: string) => byStatus.find((r) => r.status === s)?.n ?? 0;

  const { products } = readCatalogData();
  const lowStock = products
    .filter((p) => p.active)
    .flatMap((p) =>
      p.variants
        .filter((v) => v.stock !== null && v.stock <= p.lowStockThreshold)
        .map((v) => ({
          product: p.nameAr,
          variant: v.sizeLabelAr,
          sku: v.sku,
          stock: v.stock as number,
          threshold: p.lowStockThreshold,
        })),
    )
    .sort((a, b) => a.stock - b.stock);

  const recentOrders = listOrders({ limit: 8 });

  const bestRows = db
    .prepare(
      `SELECT oi.product_id, oi.variant_id,
              MAX(oi.name_ar) AS name_ar, MAX(oi.size_ar) AS size_ar,
              SUM(oi.qty) AS qty, SUM(oi.qty * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelled'
       GROUP BY oi.product_id, oi.variant_id
       ORDER BY qty DESC
       LIMIT 6`,
    )
    .all() as {
    product_id: string;
    variant_id: string;
    name_ar: string;
    size_ar: string;
    qty: number;
    revenue: number;
  }[];

  const now = new Date();
  const dayKey = (iso: string) => iso.slice(0, 10);

  // Daily: last 14 days (only days with orders are returned by SQL; we fill gaps).
  const dailyRows = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS orders, SUM(total) AS revenue
       FROM orders WHERE created_at >= ? GROUP BY day ORDER BY day`,
    )
    .all(new Date(now.getTime() - 13 * 864e5).toISOString()) as {
    day: string;
    orders: number;
    revenue: number;
  }[];
  const dailyMap = new Map(dailyRows.map((r) => [dayKey(r.day), r]));
  const daily: SalesPoint[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 864e5);
    const key = d.toISOString().slice(0, 10);
    const row = dailyMap.get(key);
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      date: key,
      orders: row?.orders ?? 0,
      revenue: row?.revenue ?? 0,
    };
  });

  // Weekly: last 8 ISO-ish weeks (Mon-start).
  const weeklyRows = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, SUM(total) AS revenue, COUNT(*) AS orders
       FROM orders WHERE created_at >= ? GROUP BY day`,
    )
    .all(new Date(now.getTime() - 55 * 864e5).toISOString()) as {
    day: string;
    revenue: number;
    orders: number;
  }[];
  const weeklyBuckets = new Map<string, { revenue: number; orders: number }>();
  for (const row of weeklyRows) {
    const d = new Date(row.day);
    const offset = (d.getUTCDay() + 6) % 7; // Monday = 0
    const monday = new Date(d.getTime() - offset * 864e5);
    const key = monday.toISOString().slice(0, 10);
    const bucket = weeklyBuckets.get(key) ?? { revenue: 0, orders: 0 };
    bucket.revenue += row.revenue;
    bucket.orders += row.orders;
    weeklyBuckets.set(key, bucket);
  }
  const weekly: SalesPoint[] = Array.from({ length: 8 }, (_, i) => {
    const monday = new Date(now.getTime() - (7 - i) * 7 * 864e5);
    const key = monday.toISOString().slice(0, 10);
    const bucket = weeklyBuckets.get(key);
    return {
      label: `${monday.getDate()}/${monday.getMonth() + 1}`,
      date: key,
      orders: bucket?.orders ?? 0,
      revenue: bucket?.revenue ?? 0,
    };
  });

  // Monthly: last 6 months.
  const monthlyRows = db
    .prepare(
      `SELECT substr(created_at, 1, 7) AS month, SUM(total) AS revenue, COUNT(*) AS orders
       FROM orders WHERE created_at >= ? GROUP BY month ORDER BY month`,
    )
    .all(
      new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(),
    ) as { month: string; revenue: number; orders: number }[];
  const monthlyMap = new Map(monthlyRows.map((r) => [r.month, r]));
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const monthly: SalesPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = monthlyMap.get(key);
    return {
      label: monthNames[d.getMonth()],
      date: `${key}-01`,
      orders: row?.orders ?? 0,
      revenue: row?.revenue ?? 0,
    };
  });

  return {
    revenue: totals.revenue,
    orders: totals.orders,
    pending: statusCount("pending"),
    processing: statusCount("processing") + statusCount("confirmed"),
    delivered: statusCount("delivered"),
    cancelled: statusCount("cancelled"),
    averageOrder: totals.orders > 0 ? Math.round(totals.avg_order) : 0,
    products: products.filter((p) => p.active).length,
    lowStock,
    recentOrders,
    bestSellers: bestRows.map((r) => ({
      productId: r.product_id,
      variantId: r.variant_id,
      name: r.name_ar,
      size: r.size_ar,
      qty: r.qty,
      revenue: r.revenue,
    })),
    series: { daily, weekly, monthly },
    revenueByDay: daily,
  };
}

/* ------------------------------------------------------------------ */
/* Internal notes                                                       */
/* ------------------------------------------------------------------ */

export function getOrderNotes(orderId: string): OrderNote[] {
  return getDb()
    .prepare("SELECT * FROM order_notes WHERE order_id = ? ORDER BY created_at DESC")
    .all(orderId) as OrderNote[];
}

export function addOrderNote(orderId: string, body: string, author: string): void {
  getDb()
    .prepare("INSERT INTO order_notes (id, order_id, body, author, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), orderId, body.slice(0, 2000), author.slice(0, 120), new Date().toISOString());
}

export function deleteOrderNote(noteId: string): void {
  getDb().prepare("DELETE FROM order_notes WHERE id = ?").run(noteId);
}

export function updateOrderStatus(reference: string, status: OrderStatus): void {
  getDb()
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE reference = ?")
    .run(status, new Date().toISOString(), reference.toUpperCase());
}

/* ------------------------------------------------------------------ */
/* Customers (derived from orders — no separate table to drift)         */
/* ------------------------------------------------------------------ */

export type CustomerRecord = {
  phone: string;
  name: string;
  orders: number;
  totalSpent: number;
  lastOrderAt: string;
  governorate: string;
  city: string;
};

export function listCustomers(limit = 200): CustomerRecord[] {
  return getDb()
    .prepare(
      `SELECT
         phone,
         MAX(customer_name) AS name,
         COUNT(*) AS orders,
         SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) AS total_spent,
         MAX(created_at) AS last_order_at,
         MAX(governorate) AS governorate,
         MAX(city) AS city
       FROM orders
       GROUP BY phone
       ORDER BY last_order_at DESC
       LIMIT ?`,
    )
    .all(limit)
    .map((row) => {
      const r = row as {
        phone: string;
        name: string;
        orders: number;
        total_spent: number;
        last_order_at: string;
        governorate: string;
        city: string;
      };
      return {
        phone: r.phone,
        name: r.name,
        orders: r.orders,
        totalSpent: r.total_spent,
        lastOrderAt: r.last_order_at,
        governorate: r.governorate,
        city: r.city,
      };
    });
}

/* ------------------------------------------------------------------ */
/* CSV export                                                           */
/* ------------------------------------------------------------------ */

const csvEscape = (value: unknown) => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function ordersToCsv(query: OrderQuery = {}): string {
  const orders = listOrders({ ...query, limit: 1000 });
  const header = [
    "reference",
    "created_at",
    "status",
    "customer_name",
    "phone",
    "governorate",
    "city",
    "address",
    "payment_method",
    "subtotal",
    "shipping",
    "total",
    "items",
    "customer_notes",
  ];
  const rows = orders.map((o) => {
    const items = getDb()
      .prepare(
        "SELECT name_ar, size_ar, unit_price, qty FROM order_items WHERE order_id = ?",
      )
      .all(o.id) as { name_ar: string; size_ar: string; unit_price: number; qty: number }[];
    const itemsText = items
      .map((i) => `${i.name_ar} ${i.size_ar} × ${i.qty} = ${i.unit_price * i.qty}`)
      .join(" | ");
    return [
      o.reference,
      o.created_at,
      o.status,
      o.customer_name,
      o.phone,
      o.governorate,
      o.city,
      o.address,
      o.payment_method,
      o.subtotal,
      o.shipping,
      o.total,
      itemsText,
      o.notes ?? "",
    ]
      .map(csvEscape)
      .join(",");
  });
  // BOM so Excel opens Arabic correctly.
  return `\uFEFF${[header.join(","), ...rows].join("\n")}`;
}

/** Re-export the free-shipping helpers the checkout needs. */
export { isFreeCity, isWholesale, shippingFeeFor };
