import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { getDb, type Db } from "./db";
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
  cost: number | null;
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
      cost: v.cost ?? null,
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

export async function readCatalogData(options: { fallbackImage?: boolean } = {}): Promise<{
  products: Product[];
  categories: Category[];
}> {
  const fallbackImage = options.fallbackImage ?? true;
  const db = await getDb();

  const categoryRows = await db
    .prepare("SELECT * FROM categories ORDER BY sort_order, name_ar")
    .all<{
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      sort_order: number;
      active: number;
    }>();

  const categoryNames = new Map(
    categoryRows.map((c) => [c.id, { ar: c.name_ar, en: c.name_en }]),
  );

  // Two queries, not 2×N: the remote database is over HTTP, so per-product
  // round-trips would make every storefront render needlessly slow.
  const [productRows, variantRows, imageRows] = await Promise.all([
    db.prepare("SELECT * FROM products ORDER BY sort_order, created_at").all<ProductRow>(),
    db
      .prepare("SELECT * FROM product_variants ORDER BY sort_order, ml")
      .all<VariantRow>(),
    db.prepare("SELECT * FROM product_images ORDER BY sort_order").all<ImageRow>(),
  ]);

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const variant of variantRows) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }
  const imagesByProduct = new Map<string, ImageRow[]>();
  for (const image of imageRows) {
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push(image);
    imagesByProduct.set(image.product_id, list);
  }

  const products = productRows.map((row) =>
    mapProduct(
      row,
      variantsByProduct.get(row.id) ?? [],
      imagesByProduct.get(row.id) ?? [],
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

export const listProductsAdmin = async () => (await readCatalogData()).products;

export async function getProductAdmin(id: string): Promise<Product | null> {
  const { products } = await readCatalogData();
  return products.find((p) => p.id === id) ?? null;
}

/** Editor-accurate read: no synthetic fallback image. */
export async function getProductForEdit(id: string): Promise<Product | null> {
  const { products } = await readCatalogData({ fallbackImage: false });
  return products.find((p) => p.id === id) ?? null;
}

export async function getProductBySlugAdmin(slug: string): Promise<Product | null> {
  const { products } = await readCatalogData();
  return products.find((p) => p.slug === slug) ?? null;
}

export const listCategoriesAdmin = async () => (await readCatalogData()).categories;

/* ------------------------------------------------------------------ */
/* Mutations — every one refreshes the storefront cache                 */
/* ------------------------------------------------------------------ */

const touch = () => new Date().toISOString();

function invalidateCatalog() {
  // Server actions only: expire immediately so the editor sees its own write.
  updateTag(CATALOG_TAG);
}

async function writeVariants(tx: Db, productId: string, variants: ProductInput["variants"]) {
  await tx.prepare("DELETE FROM product_variants WHERE product_id = ?").run(productId);
  const stmt = tx.prepare(
    `INSERT INTO product_variants (id, product_id, size_ar, size_en, ml, price, compare_at, stock, cost, sku, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const [index, v] of variants.entries()) {
    await stmt.run(
      v.id || `${productId}-v${index + 1}`,
      productId,
      v.sizeLabelAr,
      v.sizeLabelEn,
      v.ml,
      v.price,
      v.compareAt,
      v.stock,
      v.cost,
      v.sku,
      index,
    );
  }
}

async function writeImages(tx: Db, productId: string, images: ProductInput["images"]) {
  await tx.prepare("DELETE FROM product_images WHERE product_id = ?").run(productId);
  const stmt = tx.prepare(
    `INSERT INTO product_images (id, product_id, src, alt_ar, alt_en, sort_order, is_primary)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const [index, img] of images.entries()) {
    await stmt.run(
      randomUUID(),
      productId,
      img.src,
      img.altAr,
      img.altEn,
      index,
      img.isPrimary || (index === 0 && !images.some((i) => i.isPrimary)) ? 1 : 0,
    );
  }
}

export async function createProduct(input: ProductInput): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  const now = touch();

  await db.transaction(async (tx) => {
    await tx.prepare(
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
    await writeVariants(tx, id, input.variants);
    await writeImages(tx, id, input.images);
  });

  invalidateCatalog();
  return id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const db = await getDb();
  const now = touch();

  await db.transaction(async (tx) => {
    await tx.prepare(
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
    await writeVariants(tx, id, input.variants);
    await writeImages(tx, id, input.images);
  });

  invalidateCatalog();
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM products WHERE id = ?").run(id);
  invalidateCatalog();
}

export async function setProductFlags(
  id: string,
  flags: { active?: boolean; featured?: boolean },
): Promise<void> {
  const db = await getDb();
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
  await db.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  invalidateCatalog();
}

/** Move a product up/down within its display order (admin list). */
export async function moveProduct(id: string, direction: "up" | "down"): Promise<void> {
  const db = await getDb();
  const all = await db
    .prepare("SELECT id, sort_order FROM products ORDER BY sort_order, created_at")
    .all<{ id: string; sort_order: number }>();
  const index = all.findIndex((p) => p.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= all.length) return;

  const now = touch();
  await db.transaction(async (tx) => {
    await tx
      .prepare("UPDATE products SET sort_order = ?, updated_at = ? WHERE id = ?")
      .run(all[index].sort_order, now, all[swapWith].id);
    await tx
      .prepare("UPDATE products SET sort_order = ?, updated_at = ? WHERE id = ?")
      .run(all[swapWith].sort_order, now, all[index].id);
  });
  invalidateCatalog();
}

/** Replace a product's image list (used by the media picker in the editor). */
export async function setProductImages(id: string, images: ProductInput["images"]): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await writeImages(tx, id, images);
    await tx.prepare("UPDATE products SET updated_at = ? WHERE id = ?").run(touch(), id);
  });
  invalidateCatalog();
}

/* ------------------------------------------------------------------ */
/* Categories                                                           */
/* ------------------------------------------------------------------ */

export async function createCategory(input: CategoryInput): Promise<string> {
  const id = randomUUID();
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO categories (id, slug, name_ar, name_en, sort_order, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.slug, input.nameAr, input.nameEn, input.sortOrder, input.active ? 1 : 0, touch());
  invalidateCatalog();
  return id;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      "UPDATE categories SET slug = ?, name_ar = ?, name_en = ?, sort_order = ?, active = ? WHERE id = ?",
    )
    .run(input.slug, input.nameAr, input.nameEn, input.sortOrder, input.active ? 1 : 0, id);
  invalidateCatalog();
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  // Products keep their data: category_id goes NULL (ON DELETE SET NULL).
  await db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  invalidateCatalog();
}
