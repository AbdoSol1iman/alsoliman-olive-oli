import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { getDb, uploadsDir } from "./db";
import { CATALOG_TAG } from "./catalog";
import { CONTENT_TAG } from "./content";
import { CONTENT_LAYOUT_TAG } from "./settings";
import { MEDIA_CATEGORIES, type MediaCategory, type MediaItem } from "./media-shared";

export { MEDIA_CATEGORIES };
export type { MediaCategory, MediaItem };

export const MEDIA_TAG = "media";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 1600;
const THUMB_EDGE = 400;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

type MediaRow = {
  id: string;
  path: string;
  thumb_path: string | null;
  original_name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt_ar: string;
  alt_en: string;
  category: string;
  created_at: string;
};

const mapMedia = (row: MediaRow): MediaItem => ({
  id: row.id,
  path: row.path,
  thumbPath: row.thumb_path,
  originalName: row.original_name,
  mime: row.mime,
  size: row.size,
  width: row.width,
  height: row.height,
  altAr: row.alt_ar,
  altEn: row.alt_en,
  category: row.category,
  createdAt: row.created_at,
});

/**
 * Persist an uploaded image: optimise to WebP (rotated, capped at 1600px,
 * alpha preserved), build a 400px thumbnail, and store both payloads in the
 * database. Serverless hosts (Vercel) expose a read-only filesystem, so the
 * database is the only storage that survives every deploy without an extra
 * object-storage service.
 */
export async function saveUploadedImage(
  file: File,
  {
    category = "general",
    altAr = "",
    altEn = "",
  }: { category?: string; altAr?: string; altEn?: string } = {},
): Promise<MediaItem> {
  if (!ALLOWED_MIME.has(file.type)) throw new Error("unsupported_type");
  if (file.size > MAX_BYTES) throw new Error("file_too_large");

  const input = Buffer.from(await file.arrayBuffer());

  const pipeline = sharp(input, { failOn: "error" }).rotate();
  const [optimized, thumb, meta] = await Promise.all([
    pipeline
      .clone()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
    pipeline
      .clone()
      .resize(THUMB_EDGE, THUMB_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75, effort: 4 })
      .toBuffer(),
    pipeline.clone().metadata(),
  ]);

  const id = randomUUID();
  const now = new Date();
  const subDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

  const relPath = `/api/media/${subDir}/${id}.webp`;
  const relThumb = `/api/media/${subDir}/${id}-thumb.webp`;

  const item: MediaItem = {
    id,
    path: relPath,
    thumbPath: relThumb,
    originalName: file.name.slice(0, 200),
    mime: "image/webp",
    size: optimized.data.length,
    width: meta.width ?? null,
    height: meta.height ?? null,
    altAr: altAr.slice(0, 200),
    altEn: altEn.slice(0, 200),
    category: MEDIA_CATEGORIES.includes(category as MediaCategory) ? category : "general",
    createdAt: now.toISOString(),
  };

  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .prepare(
        `INSERT INTO media (id, path, thumb_path, original_name, mime, size, width, height, alt_ar, alt_en, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        item.id,
        item.path,
        item.thumbPath,
        item.originalName,
        item.mime,
        item.size,
        item.width,
        item.height,
        item.altAr,
        item.altEn,
        item.category,
        item.createdAt,
      );
    await tx
      .prepare("INSERT INTO media_blobs (media_id, data, thumb_data) VALUES (?, ?, ?)")
      .run(item.id, new Uint8Array(optimized.data), new Uint8Array(thumb));
  });

  updateTag(MEDIA_TAG);
  return item;
}

export async function listMedia(category?: string): Promise<MediaItem[]> {
  const db = await getDb();
  const rows =
    category && MEDIA_CATEGORIES.includes(category as MediaCategory)
      ? await db
          .prepare("SELECT * FROM media WHERE category = ? ORDER BY created_at DESC")
          .all<MediaRow>(category)
      : await db.prepare("SELECT * FROM media ORDER BY created_at DESC").all<MediaRow>();
  return rows.map(mapMedia);
}

export const getMediaById = async (id: string) => {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM media WHERE id = ?").get<MediaRow>(id);
  return row ? mapMedia(row) : null;
};

const toBytes = (value: unknown): Uint8Array | null => {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return new Uint8Array(value);
  return null;
};

/**
 * Read an uploaded image (or its thumbnail) straight from the database.
 * Returns null for rows created before blobs moved into the database — the
 * API route then falls back to the legacy `data/uploads/` file.
 */
export async function getMediaFileByPath(
  servedPath: string,
): Promise<Uint8Array | null> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT m.path, m.thumb_path, b.data, b.thumb_data
       FROM media m JOIN media_blobs b ON b.media_id = m.id
       WHERE m.path = ? OR m.thumb_path = ?
       LIMIT 1`,
    )
    .get<{
      path: string;
      thumb_path: string | null;
      data: ArrayBuffer | Uint8Array;
      thumb_data: ArrayBuffer | Uint8Array | null;
    }>(servedPath, servedPath);
  if (!row) return null;
  return toBytes(row.path === servedPath ? row.data : row.thumb_data);
}

export async function updateMediaMeta(
  id: string,
  { altAr, altEn, category }: { altAr?: string; altEn?: string; category?: string },
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (altAr !== undefined) {
    sets.push("alt_ar = ?");
    values.push(altAr.slice(0, 200));
  }
  if (altEn !== undefined) {
    sets.push("alt_en = ?");
    values.push(altEn.slice(0, 200));
  }
  if (category !== undefined && MEDIA_CATEGORIES.includes(category as MediaCategory)) {
    sets.push("category = ?");
    values.push(category);
  }
  if (!sets.length) return;
  values.push(id);
  const db = await getDb();
  await db.prepare(`UPDATE media SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  updateTag(MEDIA_TAG);
}

/**
 * Where is this file used? Product images live in `product_images`; site
 * content (banners, hero/story images, logo) lives in the settings table.
 * Deletion is blocked while a reference exists, so an admin can never break
 * a live page by accident.
 */
export async function findMediaUsage(src: string): Promise<{ kind: string; label: string }[]> {
  const db = await getDb();
  const usage: { kind: string; label: string }[] = [];

  const products = await db
    .prepare(
      `SELECT DISTINCT p.name_ar FROM product_images i JOIN products p ON p.id = i.product_id WHERE i.src = ?`,
    )
    .all<{ name_ar: string }>(src);
  for (const p of products) usage.push({ kind: "product", label: p.name_ar });

  const settings = await db
    .prepare("SELECT key, value FROM settings WHERE key LIKE 'content:%'")
    .all<{ key: string; value: string }>();
  for (const row of settings) {
    if (row.value.includes(src)) {
      usage.push({ kind: "content", label: row.key.replace("content:", "") });
    }
  }

  return usage;
}

export async function deleteMedia(id: string): Promise<void> {
  const item = await getMediaById(id);
  if (!item) return;

  const usage = await findMediaUsage(item.path);
  if (usage.length > 0) throw new Error("media_in_use");

  const dir = path.join(uploadsDir, path.dirname(item.path).replace("/api/media/", ""));
  const fileBase = path.basename(item.path);
  const thumbBase = item.thumbPath ? path.basename(item.thumbPath) : null;

  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.prepare("DELETE FROM media_blobs WHERE media_id = ?").run(id);
    await tx.prepare("DELETE FROM media WHERE id = ?").run(id);
  });

  // Legacy uploads may still have a file on disk (local dev / older volumes).
  // Best-effort only: the database row is the source of truth now.
  await Promise.allSettled([
    fs.unlink(path.join(dir, fileBase)),
    thumbBase ? fs.unlink(path.join(dir, thumbBase)) : Promise.resolve(),
  ]);

  updateTag(MEDIA_TAG);
  updateTag(CATALOG_TAG);
  updateTag(CONTENT_TAG);
  updateTag(CONTENT_LAYOUT_TAG);
}

/** Map a served URL back to a file inside the uploads directory. */
export function resolveUploadPath(segments: string[]): string | null {
  if (segments.length !== 3) return null;
  const [year, month, file] = segments;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return null;
  if (!/^[a-z0-9-]+(?:-thumb)?\.webp$/.test(file)) return null;
  const resolved = path.resolve(uploadsDir, year, month, file);
  if (!resolved.startsWith(path.resolve(uploadsDir) + path.sep)) return null;
  return resolved;
}
