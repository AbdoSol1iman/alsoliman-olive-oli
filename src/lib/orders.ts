import "server-only";
import { revalidateTag } from "next/cache";
import { getDb } from "./db";
import { readCatalogData, CATALOG_TAG } from "./catalog";
import { readSettingsFresh, shippingFeeFor, isWholesale, type Settings } from "./settings";
import { checkoutSchema } from "./checkout-schema";
import { buildConfirmedOrderMessage, whatsappOrderHref } from "./whatsapp";
import type { Locale } from "./products";
import { randomUUID } from "node:crypto";
import {
  attachOrderAttribution,
  normaliseAttribution,
  recordOrderStatus,
  recordServerPurchase,
} from "./tracking";

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
  /** Cost snapshot at order time — NULL when the owner has not entered a cost. */
  unit_cost: number | null;
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

export type CreateOrderResult =
  | {
      ok: true;
      reference: string;
      /**
       * `wa.me` deep link carrying the whole order. Checkout opens it on
       * success — the WhatsApp hand-off is part of placing an order, not an
       * optional extra button. `null` only when no number is configured.
       */
      whatsappHref: string | null;
      /** Authoritative server total, returned for analytics/Purchase events. */
      total: number;
    }
  | { ok: false; code: string };

export async function createOrder(raw: unknown): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: parsed.error.issues[0]?.message ?? "invalid_input" };
  }
  const input = parsed.data;
  const db = await getDb();

  // Re-price on the server — never trust client totals. Fresh reads (not the
  // cached catalog) so a just-edited price is always what gets charged.
  const { products } = await readCatalogData();
  const settings = await readSettingsFresh();

  // The zone list is owner-editable — validate against the live settings.
  if (!(input.governorate in settings.shipping.zones)) {
    return { ok: false, code: "invalid_zone" };
  }

  // Merge duplicate lines for the same variant so the stock check cannot be
  // bypassed by splitting one quantity across repeated cart lines. Variant ids
  // are globally unique, so they are the safe key after the size split.
  const requested = new Map<string, { variantId: string; qty: number }>();
  for (const item of input.items) {
    const current = requested.get(item.variantId);
    if (current) current.qty += item.qty;
    else requested.set(item.variantId, { variantId: item.variantId, qty: item.qty });
  }

  const lines = [...requested.values()].flatMap((item) => {
    // Variant-first lookup: stale product ids from pre-split carts still
    // resolve to the product that now owns this size.
    const product = products.find(
      (p) =>
        p.active &&
        !p.comingSoon &&
        p.variants.some((v) => v.id === item.variantId),
    );
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
      unitCost: variant.cost,
      qty: item.qty,
    }];
  });

  if (lines.length !== requested.size) {
    console.log("[order] unavailable", JSON.stringify(input.items), lines.length);
    return { ok: false, code: "unavailable" };
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const fee = shippingFeeFor(settings, {
    governorate: input.governorate,
    totalQty,
    subtotal,
  });
  const total = subtotal + fee;

  const id = randomUUID();
  const reference = makeReference();
  const now = new Date().toISOString();

  const outcome = await db.transaction(async (tx) => {
    // Idempotency: a retry / double submit with the same key returns the order
    // that already exists instead of creating a second one.
    const existing = await tx
      .prepare("SELECT reference, total FROM orders WHERE idempotency_key = ?")
      .get<{ reference: string; total: number }>(input.idempotencyKey);
    if (existing) {
      return { reference: existing.reference, total: existing.total, created: false };
    }

    // `OR IGNORE` keeps the UNIQUE idempotency key safe when two concurrent
    // requests both pass the check above: exactly one INSERT wins.
    // The status is always `pending`: opening WhatsApp is not proof that the
    // customer sent anything, so only the owner can confirm an order later.
    const inserted = await tx
      .prepare(
        `INSERT OR IGNORE INTO orders (id, reference, created_at, status, customer_name, phone, governorate, city, address, notes, payment_method, subtotal, shipping, total, idempotency_key, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
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

    if (inserted.changes === 0) {
      const raced = await tx
        .prepare("SELECT reference, total FROM orders WHERE idempotency_key = ?")
        .get<{ reference: string; total: number }>(input.idempotencyKey);
      return { reference: raced?.reference ?? null, total: raced?.total ?? total, created: false };
    }

    const itemStmt = tx.prepare(
      `INSERT INTO order_items (order_id, product_id, variant_id, name_ar, name_en, size_ar, size_en, unit_price, unit_cost, qty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of lines) {
      await itemStmt.run(
        id,
        l.productId,
        l.variantId,
        l.nameAr,
        l.nameEn,
        l.sizeAr,
        l.sizeEn,
        l.unitPrice,
        l.unitCost,
        l.qty,
      );
    }

    await recordOrderStatus(tx, id, "pending", now, "", "system");
    await attachOrderAttribution(tx, id, normaliseAttribution(input.attribution), now);

    return { reference, total, created: true };
  });

  if (!outcome.reference) {
    // A UNIQUE reference collision (not an idempotent replay). Asking the
    // customer to retry cannot duplicate anything: the retry reuses the key.
    return { ok: false, code: "server_error" };
  }

  if (outcome.created) {
    // A sale changes stock and best-seller data — refresh the storefront cache.
    // `revalidateTag` (not `updateTag`) because this now runs in a Route
    // Handler, where `updateTag` is not allowed.
    revalidateTag(CATALOG_TAG, "max");

    // One server-side Purchase event, deduplicated by the same id the browser
    // uses. Analytics must never make a stored order fail.
    try {
      await recordServerPurchase({
        reference: outcome.reference,
        total: outcome.total,
        attribution: normaliseAttribution(input.attribution),
        createdAt: now,
      });
    } catch (error) {
      console.error("[order] purchase event failed", error);
    }
  }

  return {
    ok: true,
    reference: outcome.reference,
    whatsappHref: await confirmedOrderHref(outcome.reference, input.locale),
    total: outcome.total,
  };
}

/**
 * Build the `wa.me` deep link for a stored order. Exported so the confirmation
 * page renders exactly the same complete message as the checkout hand-off
 * (name, phone, address, items, totals and reference) after a reload too.
 */
export function buildOrderWhatsappHref(
  order: OrderRecord,
  items: OrderItem[],
  settings: Settings,
  locale: Locale,
): string | null {
  const number = settings.contact.whatsappNumber;
  if (!number) return null;

  const zone = settings.shipping.zones[order.governorate];
  const message = buildConfirmedOrderMessage(
    {
      reference: order.reference,
      customerName: order.customer_name,
      phone: order.phone,
      governorate: (locale === "ar" ? zone?.ar : zone?.en) || order.governorate,
      city: order.city,
      address: order.address,
      notes: order.notes,
      payment: order.payment_method,
      items: items.map((item) => ({
        name: locale === "ar" ? item.name_ar : item.name_en,
        size: locale === "ar" ? item.size_ar : item.size_en,
        qty: item.qty,
        unitPrice: item.unit_price,
        lineTotal: item.unit_price * item.qty,
      })),
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
    },
    locale,
  );

  return whatsappOrderHref(number, message);
}

/**
 * Rebuild the WhatsApp deep link from the stored order. Reading it back (rather
 * than reusing in-memory values) means a retried submit — which returns the
 * original reference from the idempotency key — still gets a correct message.
 */
async function confirmedOrderHref(reference: string, locale: Locale): Promise<string | null> {
  const settings = await readSettingsFresh();
  const found = await getOrderByReference(reference);
  if (!found) return null;
  return buildOrderWhatsappHref(found.order, found.items, settings, locale);
}

export async function getOrderByReference(reference: string) {
  const db = await getDb();
  const ref = reference.toUpperCase();
  // Both reads are keyed by the reference, so they can run together instead
  // of paying two serial remote-database round trips.
  const [order, items] = await Promise.all([
    db.prepare("SELECT * FROM orders WHERE reference = ?").get<OrderRecord>(ref),
    db
      .prepare(
        `SELECT oi.product_id, oi.variant_id, oi.name_ar, oi.name_en,
                oi.size_ar, oi.size_en, oi.unit_price, oi.unit_cost, oi.qty
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.reference = ?`,
      )
      .all<OrderItem>(ref),
  ]);
  if (!order) return null;
  return { order, items };
}

export async function getOrderById(id: string) {
  const db = await getDb();
  return db.prepare("SELECT * FROM orders WHERE id = ?").get<OrderRecord>(id);
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

export async function listOrders(query: OrderQuery = {}): Promise<OrderRecord[]> {
  const db = await getDb();
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
  return db.prepare(sql).all<OrderRecord>(...params);
}

export async function countOrders(query: OrderQuery = {}) {
  const { limit: _l, offset: _o, ...rest } = query;
  const db = await getDb();
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
  const row = (await db
    .prepare(`SELECT COUNT(*) AS n FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`)
    .get<{ n: number }>(...params))!;
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

export async function orderStats(): Promise<DashboardStats> {
  const db = await getDb();
  const now = new Date();

  // Every read below is independent. Issuing them together means a remote
  // Turso database pays one parallel batch instead of a serial round trip per
  // query — that waterfall was what made the dashboard take ~2 seconds.
  const [
    statusRows,
    productCount,
    lowStock,
    recentOrders,
    bestRows,
    dailyRows,
    monthlyRows,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT status, COUNT(*) AS n, COALESCE(SUM(total), 0) AS revenue
         FROM orders GROUP BY status`,
      )
      .all<{ status: string; n: number; revenue: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM products WHERE active = 1").get<{ n: number }>(),
    // Stock alerts computed in SQL instead of loading the whole catalog.
    db
      .prepare(
        `SELECT p.name_ar AS product, v.size_ar AS variant, v.sku AS sku,
                v.stock AS stock, p.low_stock_threshold AS threshold
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE p.active = 1 AND v.stock IS NOT NULL AND v.stock <= p.low_stock_threshold
         ORDER BY v.stock`,
      )
      .all<{
        product: string;
        variant: string;
        sku: string;
        stock: number;
        threshold: number;
      }>(),
    listOrders({ limit: 8 }),
    db
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
      .all<{
        product_id: string;
        variant_id: string;
        name_ar: string;
        size_ar: string;
        qty: number;
        revenue: number;
      }>(),
    // 55 days covers both the 14-day chart and the 8 weekly buckets.
    db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS orders, SUM(total) AS revenue
         FROM orders WHERE created_at >= ? GROUP BY day ORDER BY day`,
      )
      .all<{ day: string; orders: number; revenue: number }>(
        new Date(now.getTime() - 55 * 864e5).toISOString(),
      ),
    db
      .prepare(
        `SELECT substr(created_at, 1, 7) AS month, SUM(total) AS revenue, COUNT(*) AS orders
         FROM orders WHERE created_at >= ? GROUP BY month ORDER BY month`,
      )
      .all<{ month: string; revenue: number; orders: number }>(
        new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(),
      ),
  ]);

  const orders = statusRows.reduce((sum, row) => sum + row.n, 0);
  const revenue = statusRows.reduce((sum, row) => sum + row.revenue, 0);
  const statusCount = (s: string) => statusRows.find((r) => r.status === s)?.n ?? 0;

  // Daily: last 14 days (SQL returns only days with orders; fill the gaps).
  const dailyMap = new Map(dailyRows.map((r) => [r.day, r]));
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

  // Weekly: last 8 ISO-ish weeks (Mon-start), derived from the same daily rows.
  const weeklyBuckets = new Map<string, { revenue: number; orders: number }>();
  for (const row of dailyRows) {
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
    revenue,
    orders,
    pending: statusCount("pending"),
    processing: statusCount("processing") + statusCount("confirmed"),
    delivered: statusCount("delivered"),
    cancelled: statusCount("cancelled"),
    averageOrder: orders > 0 ? Math.round(revenue / orders) : 0,
    products: productCount?.n ?? 0,
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

export async function getOrderNotes(orderId: string): Promise<OrderNote[]> {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM order_notes WHERE order_id = ? ORDER BY created_at DESC")
    .all<OrderNote>(orderId);
}

export async function addOrderNote(orderId: string, body: string, author: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare("INSERT INTO order_notes (id, order_id, body, author, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), orderId, body.slice(0, 2000), author.slice(0, 120), new Date().toISOString());
}

export async function deleteOrderNote(noteId: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM order_notes WHERE id = ?").run(noteId);
}

/**
 * Change an order's status.
 *
 * Confirmation is deliberately manual: the WhatsApp hand-off only opens a chat,
 * so an order stays `pending` until an authenticated admin moves it forward
 * here. The admin identity is mandatory — status history must always name the
 * person who confirmed, never a silent `system` actor.
 */
export async function updateOrderStatus(
  reference: string,
  status: OrderStatus,
  changedBy: string,
): Promise<void> {
  const actor = changedBy.trim();
  if (!actor) {
    throw new Error("updateOrderStatus requires an authenticated admin identity");
  }
  const db = await getDb();
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const order = await tx
      .prepare("SELECT id, status FROM orders WHERE reference = ?")
      .get<{ id: string; status: OrderStatus }>(reference.toUpperCase());
    if (!order || order.status === status) return;
    await tx
      .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, now, order.id);
    await recordOrderStatus(tx, order.id, status, now, actor, "admin");
  });
}

/**
 * Permanently remove an order and everything attached to it. Child rows are
 * deleted explicitly (not left to `ON DELETE CASCADE`) so the delete is atomic
 * on remote Turso databases too, where foreign-key enforcement may be off.
 * Returns false when the reference does not exist.
 */
export async function deleteOrder(reference: string): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const order = await tx
      .prepare("SELECT id FROM orders WHERE reference = ?")
      .get<{ id: string }>(reference.toUpperCase());
    if (!order) return false;

    await tx.prepare("DELETE FROM order_items WHERE order_id = ?").run(order.id);
    await tx.prepare("DELETE FROM order_notes WHERE order_id = ?").run(order.id);
    await tx.prepare("DELETE FROM order_status_history WHERE order_id = ?").run(order.id);
    await tx.prepare("DELETE FROM order_attribution WHERE order_id = ?").run(order.id);

    const result = await tx.prepare("DELETE FROM orders WHERE id = ?").run(order.id);
    return result.changes > 0;
  });
}

export type OrderStatusEvent = {
  id: string;
  status: OrderStatus;
  changed_at: string;
  changed_by: string;
  source: string;
};

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusEvent[]> {
  const db = await getDb();
  return db
    .prepare(
      "SELECT id, status, changed_at, changed_by, source FROM order_status_history WHERE order_id = ? ORDER BY changed_at",
    )
    .all<OrderStatusEvent>(orderId);
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

export async function listCustomers(limit = 200): Promise<CustomerRecord[]> {
  const db = await getDb();
  const rows = await db
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
    .all<{
      phone: string;
      name: string;
      orders: number;
      total_spent: number;
      last_order_at: string;
      governorate: string;
      city: string;
    }>(limit);

  return rows.map((r) => ({
    phone: r.phone,
    name: r.name,
    orders: r.orders,
    totalSpent: r.total_spent,
    lastOrderAt: r.last_order_at,
    governorate: r.governorate,
    city: r.city,
  }));
}

/* ------------------------------------------------------------------ */
/* CSV export                                                           */
/* ------------------------------------------------------------------ */

const csvEscape = (value: unknown) => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function ordersToCsv(query: OrderQuery = {}): Promise<string> {
  const orders = await listOrders({ ...query, limit: 1000 });
  const db = await getDb();
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
  const rows = await Promise.all(
    orders.map(async (o) => {
      const items = await db
        .prepare(
          "SELECT name_ar, size_ar, unit_price, qty FROM order_items WHERE order_id = ?",
        )
        .all<{ name_ar: string; size_ar: string; unit_price: number; qty: number }>(o.id);
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
    }),
  );
  // BOM so Excel opens Arabic correctly.
  return `\uFEFF${[header.join(","), ...rows].join("\n")}`;
}

/** Re-export the shipping helpers the checkout needs. */
export { isWholesale, shippingFeeFor };
