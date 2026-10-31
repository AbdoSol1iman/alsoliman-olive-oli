import "server-only";
import { getDb } from "./db";
import { products } from "./products";
import { shippingFeeFor, type ZoneKey } from "./config";
import { checkoutSchema } from "./checkout-schema";

export { governorateKeys } from "./checkout-schema";

export type OrderRecord = {
  id: string;
  reference: string;
  created_at: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
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
};

export type OrderItem = {
  name_ar: string;
  name_en: string;
  size_ar: string;
  size_en: string;
  unit_price: number;
  qty: number;
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

  // Re-price on the server — never trust client totals.
  const lines = input.items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
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
  // Mansoura and wholesale orders ship free — same resolver as the checkout preview.
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const fee = shippingFeeFor({
    governorate: input.governorate as ZoneKey,
    city: input.city,
    totalQty,
  });
  const total = subtotal + fee;

  const existing = db
    .prepare("SELECT reference FROM orders WHERE idempotency_key = ?")
    .get(input.idempotencyKey) as { reference: string } | undefined;
  if (existing) return { ok: true, reference: existing.reference };

  const id = crypto.randomUUID();
  const reference = makeReference();

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO orders (id, reference, created_at, status, customer_name, phone, governorate, city, address, notes, payment_method, subtotal, shipping, total, idempotency_key)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      reference,
      new Date().toISOString(),
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
  return { ok: true, reference };
}

export function getOrderByReference(reference: string) {
  const db = getDb();
  const order = db
    .prepare("SELECT * FROM orders WHERE reference = ?")
    .get(reference.toUpperCase()) as OrderRecord | undefined;
  if (!order) return null;
  const items = db
    .prepare("SELECT name_ar, name_en, size_ar, size_en, unit_price, qty FROM order_items WHERE order_id = ?")
    .all(order.id) as OrderItem[];
  return { order, items };
}

export function listOrders(limit = 50, status?: string) {
  const db = getDb();
  const known = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (status && known.includes(status)) {
    return db
      .prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?")
      .all(status, limit) as OrderRecord[];
  }
  return db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?")
    .all(limit) as OrderRecord[];
}

export function orderStats() {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders")
    .get() as { count: number; revenue: number };
  const pending = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'")
    .get() as { count: number };
  return { count: row.count, revenue: row.revenue, pending: pending.count };
}

export function getOrderById(id: string) {
  return getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRecord | undefined;
}
