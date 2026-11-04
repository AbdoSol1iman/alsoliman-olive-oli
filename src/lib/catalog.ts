import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type { Category, Product, ProductImage, ProductSpec, Variant } from "./products";
import type { CategoryInput, ProductInput } from "./admin-schemas";

export const CATALOG_TAG = "catalog";

/* ------------------------------------------------------------------ */
/* Row mapping                                                          */
/* ------------------------------------------------------------------ */

type ProductRow = {
  id: string;
  slug: string;
  category_id: string | null;
  name_ar: string;
  name_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  hook_ar: string;
  hook_en: string;
  description_ar: string;
  description_en: string;
  storage_ar: string;
  storage_en: string;
  badge_ar: string | null;
  badge_en: string | null;
  specs: string;
  active: number;
  featured: number;
  sort_order: number;
  sample: number;
  low_stock_threshold: number;
};

type VariantRow = {
  id: string;
  product_id: string;
  size_ar: string;
  size_en: string;
  ml: number;
  price: number;
  compare_at: number | null;
  stock: number | null;
  sku: string;
  sort_order: number;
};

type ImageRow = {
  id: string;
  product_id: string;
  src: string;
  alt_ar: string;
  alt_en: string;
  sort_order: number;
  is_primary: number;
};

const parseJson = <T>(raw: string, fallback: T): T => {
  try {
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

function mapProduct(
  row: ProductRow,
  variants: VariantRow[],
  images: ImageRow[],
  categoryNames: Map<string, { ar: string; en: string }>,
  fallbackImage: boolean,
): Product {
  const category = row.category_id ? categoryNames.get(row.category_id) : undefined;
  const mappedImages: ProductImage[] = images
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ src: img.src, altAr: img.alt_ar, altEn: img.alt_en }));

  // The storefront always renders an image — fall back to the brand bottle
  // when an admin has not attached one yet.
  if (mappedImages.length === 0 && fallbackImage) {
    mappedImages.push({
      src: "/products/bottle-cutout.png",
      altAr: row.name_ar,
      altEn: row.name_en,
    });
  }

  const mappedVariants: Variant[] = variants
    .sort((a, b) => a.sort_order - b.sort_order || a.ml - b.ml)
    .map((v) => ({
      id: v.id,
      sizeLabelAr: v.size_ar,
      sizeLabelEn: v.size_en,
      ml: v.ml,
      price: v.price,
      compareAt: v.compare_at,
      stock: v.stock,
      sku: v.sku,
    }));

  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    subtitleAr: row.subtitle_ar,
    subtitleEn: row.subtitle_en,
    categoryAr: category?.ar ?? "",
    categoryEn: category?.en ?? "",
    hookAr: row.hook_ar,
    hookEn: row.hook_en,
    descriptionAr: parseJson<string[]>(row.description_ar, []),
    descriptionEn: parseJson<string[]>(row.description_en, []),
    images: mappedImages,
    variants: mappedVariants,
    specs: parseJson<ProductSpec[]>(row.specs, []),
    storageAr: row.storage_ar,
    storageEn: row.storage_en,
    badgeAr: row.badge_ar,
    badgeEn: row.badge_en,
    active: row.active === 1,
    featured: row.featured === 1,
    sortOrder: row.sort_order,
    sample: row.sample === 1,
    lowStockThreshold: row.low_stock_threshold,
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export function readCatalogData(options: { fallbackImage?: boolean } = {}): {
  products: Product[];
  categories: Category[];
} {
  const fallbackImage = options.fallbackImage ?? true;
  const db = getDb();

  const categoryRows = db
    .prepare("SELECT * FROM categories ORDER BY sort_order, name_ar")
    .all() as {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string;
    sort_order: number;
    active: number;
  }[];

  const categoryNames = new Map(
    categoryRows.map((c) => [c.id, { ar: c.name_ar, en: c.name_en }]),
  );

  const productRows = db
    .prepare("SELECT * FROM products ORDER BY sort_order, created_at")
    .all() as ProductRow[];

  const variantStmt = db.prepare(
    "SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order, ml",
  );
  const imageStmt = db.prepare(
    "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order",
  );

  const products = productRows.map((row) =>
    mapProduct(
      row,
      variantStmt.all(row.id) as VariantRow[],
      imageStmt.all(row.id) as ImageRow[],
      categoryNames,
      fallbackImage,
    ),
  );

  const categories: Category[] = categoryRows.map((c) => ({
    id: c.id,
    slug: c.slug,
    nameAr: c.name_ar,
    nameEn: c.name_en,
    sortOrder: c.sort_order,
    active: c.active === 1,
  }));

  return { products, categories };
}

/**
 * The storefront's catalog — cached with an on-demand tag so every admin
 * mutation (`updateTag('catalog')`) makes price/stock/content changes appear
 * on the live site without a rebuild or redeploy.
 */
export async function getCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  return readCatalogData();
}

/** Convenience: active products only, storefront order. */
export async function getStoreProducts(): Promise<Product[]> {
  const { products } = await getCatalog();
  return products.filter((p) => p.active);
}

/* ------------------------------------------------------------------ */
/* Uncached reads (admin, per-request)                                  */
/* ------------------------------------------------------------------ */

export const listProductsAdmin = () => readCatalogData().products;

export function getProductAdmin(id: string): Product | null {
  const { products } = readCatalogData();
  return products.find((p) => p.id === id) ?? null;
}

/** Editor-accurate read: no synthetic fallback image. */
export function getProductForEdit(id: string): Product | null {
  const { products } = readCatalogData({ fallbackImage: false });
  return products.find((p) => p.id === id) ?? null;
}

export function getProductBySlugAdmin(slug: string): Product | null {
  const { products } = readCatalogData();
  return products.find((p) => p.slug === slug) ?? null;
}

export const listCategoriesAdmin = () => readCatalogData().categories;

/* ------------------------------------------------------------------ */
/* Mutations — every one refreshes the storefront cache                 */
/* ------------------------------------------------------------------ */

const touch = () => new Date().toISOString();

function invalidateCatalog() {
  // Server actions only: expire immediately so the editor sees its own write.
  updateTag(CATALOG_TAG);
}

function writeVariants(productId: string, variants: ProductInput["variants"]) {
  const db = getDb();
  db.prepare("DELETE FROM product_variants WHERE product_id = ?").run(productId);
  const stmt = db.prepare(
    `INSERT INTO product_variants (id, product_id, size_ar, size_en, ml, price, compare_at, stock, sku, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  variants.forEach((v, index) => {
    stmt.run(
      v.id || `${productId}-v${index + 1}`,
      productId,
      v.sizeLabelAr,
      v.sizeLabelEn,
      v.ml,
      v.price,
      v.compareAt,
      v.stock,
      v.sku,
      index,
    );
  });
}

function writeImages(productId: string, images: ProductInput["images"]) {
  const db = getDb();
  db.prepare("DELETE FROM product_images WHERE product_id = ?").run(productId);
  const stmt = db.prepare(
    `INSERT INTO product_images (id, product_id, src, alt_ar, alt_en, sort_order, is_primary)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  images.forEach((img, index) => {
    stmt.run(
      randomUUID(),
      productId,
      img.src,
      img.altAr,
      img.altEn,
      index,
      img.isPrimary || (index === 0 && !images.some((i) => i.isPrimary)) ? 1 : 0,
    );
  });
}

export function createProduct(input: ProductInput): string {
  const db = getDb();
  const id = randomUUID();
  const now = touch();

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO products (
        id, slug, category_id, name_ar, name_en, subtitle_ar, subtitle_en,
        hook_ar, hook_en, description_ar, description_en, storage_ar, storage_en,
        badge_ar, badge_en, specs, active, featured, sort_order, sample,
        low_stock_threshold, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.slug,
      input.categoryId,
      input.nameAr,
      input.nameEn,
      input.subtitleAr,
      input.subtitleEn,
      input.hookAr,
      input.hookEn,
      JSON.stringify(input.descriptionAr),
      JSON.stringify(input.descriptionEn),
      input.storageAr,
      input.storageEn,
      input.badgeAr,
      input.badgeEn,
      JSON.stringify(input.specs),
      input.active ? 1 : 0,
      input.featured ? 1 : 0,
      input.sortOrder,
      input.sample ? 1 : 0,
      input.lowStockThreshold,
      now,
      now,
    );
    writeVariants(id, input.variants);
    writeImages(id, input.images);
  });

  insert();
  invalidateCatalog();
  return id;
}

export function updateProduct(id: string, input: ProductInput): void {
  const db = getDb();
  const now = touch();

  const update = db.transaction(() => {
    db.prepare(
      `UPDATE products SET
        slug = ?, category_id = ?, name_ar = ?, name_en = ?, subtitle_ar = ?, subtitle_en = ?,
        hook_ar = ?, hook_en = ?, description_ar = ?, description_en = ?, storage_ar = ?, storage_en = ?,
        badge_ar = ?, badge_en = ?, specs = ?, active = ?, featured = ?, sort_order = ?, sample = ?,
        low_stock_threshold = ?, updated_at = ?
      WHERE id = ?`,
    ).run(
      input.slug,
      input.categoryId,
      input.nameAr,
      input.nameEn,
      input.subtitleAr,
      input.subtitleEn,
      input.hookAr,
      input.hookEn,
      JSON.stringify(input.descriptionAr),
      JSON.stringify(input.descriptionEn),
      input.storageAr,
      input.storageEn,
      input.badgeAr,
      input.badgeEn,
      JSON.stringify(input.specs),
      input.active ? 1 : 0,
      input.featured ? 1 : 0,
      input.sortOrder,
      input.sample ? 1 : 0,
      input.lowStockThreshold,
      now,
      id,
    );
    writeVariants(id, input.variants);
    writeImages(id, input.images);
  });

  update();
  invalidateCatalog();
}

export function deleteProduct(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  invalidateCatalog();
}

export function setProductFlags(
  id: string,
  flags: { active?: boolean; featured?: boolean },
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (flags.active !== undefined) {
    sets.push("active = ?");
    values.push(flags.active ? 1 : 0);
  }
  if (flags.featured !== undefined) {
    sets.push("featured = ?");
    values.push(flags.featured ? 1 : 0);
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  values.push(touch(), id);
  db.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  invalidateCatalog();
}

/** Move a product up/down within its display order (admin list). */
export function moveProduct(id: string, direction: "up" | "down"): void {
  const db = getDb();
  const all = db
    .prepare("SELECT id, sort_order FROM products ORDER BY sort_order, created_at")
    .all() as { id: string; sort_order: number }[];
  const index = all.findIndex((p) => p.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= all.length) return;

  const now = touch();
  const tx = db.transaction(() => {
    db.prepare("UPDATE products SET sort_order = ?, updated_at = ? WHERE id = ?").run(
      all[index].sort_order,
      now,
      all[swapWith].id,
    );
    db.prepare("UPDATE products SET sort_order = ?, updated_at = ? WHERE id = ?").run(
      all[swapWith].sort_order,
      now,
      all[index].id,
    );
  });
  tx();
  invalidateCatalog();
}

/** Replace a product's image list (used by the media picker in the editor). */
export function setProductImages(id: string, images: ProductInput["images"]): void {
  const db = getDb();
  db.transaction(() => writeImages(id, images))();
  db.prepare("UPDATE products SET updated_at = ? WHERE id = ?").run(touch(), id);
  invalidateCatalog();
}

/* ------------------------------------------------------------------ */
/* Categories                                                           */
/* ------------------------------------------------------------------ */

export function createCategory(input: CategoryInput): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO categories (id, slug, name_ar, name_en, sort_order, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.slug, input.nameAr, input.nameEn, input.sortOrder, input.active ? 1 : 0, touch());
  invalidateCatalog();
  return id;
}

export function updateCategory(id: string, input: CategoryInput): void {
  getDb()
    .prepare(
      "UPDATE categories SET slug = ?, name_ar = ?, name_en = ?, sort_order = ?, active = ? WHERE id = ?",
    )
    .run(input.slug, input.nameAr, input.nameEn, input.sortOrder, input.active ? 1 : 0, id);
  invalidateCatalog();
}

export function deleteCategory(id: string): void {
  const db = getDb();
  // Products keep their data: category_id goes NULL (ON DELETE SET NULL).
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  invalidateCatalog();
}
