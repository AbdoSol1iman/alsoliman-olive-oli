import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDb } from "./db";
import { saveUploadedImage } from "./media";

export const REVIEWS_TAG = "reviews";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewRecord = {
  id: string;
  created_at: string;
  status: ReviewStatus;
  author_name: string;
  phone: string;
  rating: number;
  title: string | null;
  body: string;
  image_url: string | null;
  verified_order_reference: string | null;
  updated_at: string;
};

export type PublicReview = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  imageUrl: string | null;
  verified: boolean;
  createdAt: string;
};

/** Normalize Egyptian phone numbers for safe matching against orders */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "");
  const stripped = digits.replace(/^(\+20|0020|20)/, "");
  return stripped.startsWith("0") ? stripped : `0${stripped}`;
}

/** Fetch all approved reviews for the public storefront */
export async function getApprovedReviews(): Promise<PublicReview[]> {
  const db = await getDb();
  try {
    const rows = await db
      .prepare(
        `SELECT id, author_name, rating, body, image_url, verified_order_reference, created_at
         FROM reviews
         WHERE status = 'approved'
         ORDER BY created_at DESC`,
      )
      .all<{
        id: string;
        author_name: string;
        rating: number;
        body: string;
        image_url: string | null;
        verified_order_reference: string | null;
        created_at: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      authorName: r.author_name,
      rating: r.rating,
      body: r.body,
      imageUrl: r.image_url,
      verified: Boolean(r.verified_order_reference),
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("[reviews] failed to fetch approved reviews", err);
    return [];
  }
}

/** Check if a phone number corresponds to a confirmed order */
export async function verifyOrderPhone(phone: string): Promise<{
  verified: boolean;
  customerName?: string;
  orderReference?: string;
}> {
  const db = await getDb();
  const normalized = normalizePhone(phone);
  if (!/^01[0125][0-9]{8}$/.test(normalized)) {
    return { verified: false };
  }

  const order = await db
    .prepare(
      `SELECT reference, customer_name FROM orders
       WHERE phone = ? OR phone2 = ? OR phone LIKE ? OR phone2 LIKE ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get<{ reference: string; customer_name: string }>(
      normalized,
      normalized,
      `%${normalized.slice(-10)}`,
      `%${normalized.slice(-10)}`,
    );

  if (!order) return { verified: false };
  return {
    verified: true,
    customerName: order.customer_name,
    orderReference: order.reference,
  };
}

/** Submit a customer review with phone verification and optional photo */
export async function submitReview(input: {
  phone: string;
  authorName: string;
  rating: number;
  body: string;
  imageFile?: File | null;
}): Promise<{ ok: boolean; code?: string; message?: string }> {
  const db = await getDb();
  const normalized = normalizePhone(input.phone);

  if (!/^01[0125][0-9]{8}$/.test(normalized)) {
    return {
      ok: false,
      code: "invalid_phone",
      message: "رقم الموبايل غير صحيح — تأكد من إدخال 11 رقم يبدأ بـ 01.",
    };
  }

  if (!input.body.trim()) {
    return {
      ok: false,
      code: "empty_body",
      message: "يرجى كتابة رأيك في زيت الزيتون وتجربتك.",
    };
  }

  // Look up order matching phone
  const check = await verifyOrderPhone(normalized);
  if (!check.verified) {
    return {
      ok: false,
      code: "no_order",
      message:
        "عذراً، لم نجد طلباً مسجلاً بهذا الرقم. التقييم متاح فقط للعملاء الذين أتموا طلباً لتأكيد المصداقية.",
    };
  }

  let imageUrl: string | null = null;
  if (input.imageFile && input.imageFile.size > 0) {
    try {
      const author = input.authorName.trim() || check.customerName || "عميل موثق";
      const media = await saveUploadedImage(input.imageFile, {
        category: "reviews",
        altAr: `صورة تقييم من ${author}`,
        altEn: `Review photo by ${author}`,
      });
      imageUrl = media.path;
    } catch (err) {
      console.error("[reviews] photo upload failed", err);
    }
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const author = input.authorName.trim() || check.customerName || "عميل موثق";
  const rating = Math.min(5, Math.max(1, Math.round(input.rating || 5)));

  await db
    .prepare(
      `INSERT INTO reviews (id, created_at, status, author_name, phone, rating, title, body, image_url, verified_order_reference, updated_at)
       VALUES (?, ?, 'pending', ?, ?, ?, NULL, ?, ?, ?, ?)`,
    )
    .run(
      id,
      now,
      author,
      normalized,
      rating,
      input.body.trim(),
      imageUrl,
      check.orderReference || null,
      now,
    );

  revalidateTag(REVIEWS_TAG, "max");
  revalidatePath("/admin/reviews");
  return { ok: true, code: "success" };
}

/** Admin: List reviews with optional status filter */
export async function listReviewsForAdmin(status?: string): Promise<ReviewRecord[]> {
  const db = await getDb();
  let sql = "SELECT * FROM reviews";
  const params: unknown[] = [];
  if (status && status !== "all") {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC";
  return db.prepare(sql).all<ReviewRecord>(...params);
}

/** Admin: Count reviews pending approval */
export async function getPendingReviewsCount(): Promise<number> {
  const db = await getDb();
  try {
    const row = await db
      .prepare("SELECT COUNT(*) as count FROM reviews WHERE status = 'pending'")
      .get<{ count: number }>();
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Admin: Change review status (approve / reject) */
export async function setReviewStatus(
  id: string,
  status: ReviewStatus,
): Promise<{ ok: boolean }> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, id);
  revalidateTag(REVIEWS_TAG, "max");
  revalidatePath("/admin/reviews");
  return { ok: true };
}

/** Admin: Delete review permanently */
export async function deleteReview(id: string): Promise<{ ok: boolean }> {
  const db = await getDb();
  await db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
  revalidateTag(REVIEWS_TAG, "max");
  revalidatePath("/admin/reviews");
  return { ok: true };
}
