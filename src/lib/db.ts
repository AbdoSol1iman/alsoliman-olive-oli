import "server-only";
import {
  createClient,
  type Client,
  type ResultSet,
  type Transaction,
  type Value,
} from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const dataDir = process.env.DATABASE_DIR
  ? path.resolve(process.env.DATABASE_DIR)
  : path.join(process.cwd(), "data");
const dbFile = process.env.DATABASE_FILE ?? path.join(dataDir, "store.db");

/** Uploads live next to the database so one persistent volume covers both. */
export const uploadsDir = path.join(dataDir, "uploads");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone2 TEXT,
    governorate TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    payment_method TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    shipping INTEGER NOT NULL,
    total INTEGER NOT NULL,
    idempotency_key TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    size_ar TEXT NOT NULL,
    size_en TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    qty INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS order_notes (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id);

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    author_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    title TEXT,
    body TEXT NOT NULL,
    image_url TEXT,
    verified_order_reference TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
  CREATE INDEX IF NOT EXISTS idx_reviews_phone ON reviews(phone);

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    subtitle_ar TEXT NOT NULL DEFAULT '',
    subtitle_en TEXT NOT NULL DEFAULT '',
    hook_ar TEXT NOT NULL DEFAULT '',
    hook_en TEXT NOT NULL DEFAULT '',
    description_ar TEXT NOT NULL DEFAULT '[]',
    description_en TEXT NOT NULL DEFAULT '[]',
    storage_ar TEXT NOT NULL DEFAULT '',
    storage_en TEXT NOT NULL DEFAULT '',
    badge_ar TEXT,
    badge_en TEXT,
    specs TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    featured INTEGER NOT NULL DEFAULT 0,
    coming_soon INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    sample INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    /** Products that are sizes of the same oil share this family slug. */
    family_slug TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
  CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

  CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_ar TEXT NOT NULL,
    size_en TEXT NOT NULL,
    ml INTEGER NOT NULL DEFAULT 0,
    price INTEGER NOT NULL,
    compare_at INTEGER,
    stock INTEGER,
    sku TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

  CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    src TEXT NOT NULL,
    alt_ar TEXT NOT NULL DEFAULT '',
    alt_en TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);

  CREATE TABLE IF NOT EXISTS product_variant_images (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    src TEXT NOT NULL,
    alt_ar TEXT NOT NULL DEFAULT '',
    alt_en TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_variant_images_variant ON product_variant_images(variant_id);

  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    thumb_path TEXT,
    original_name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    alt_ar TEXT NOT NULL DEFAULT '',
    alt_en TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    created_at TEXT NOT NULL
  );
  /**
   * Binary payloads live in their own table so listing the library never
   * transfers image data. Keeping them in the database (rather than on disk)
   * makes uploads survive serverless hosts with a read-only filesystem.
   */
  CREATE TABLE IF NOT EXISTS media_blobs (
    media_id TEXT PRIMARY KEY,
    data BLOB NOT NULL,
    thumb_data BLOB
  );
  CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checkout_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_checkout_attempts_ip ON checkout_attempts(ip, created_at);

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`;

/* ------------------------------------------------------------------ */
/* Versioned migrations                                                */
/* ------------------------------------------------------------------ */

/**
 * Marketing analytics schema. Kept in a versioned migration (not only in
 * `SCHEMA`) so existing databases are upgraded exactly once and the schema
 * change is auditable.
 */
const MARKETING_SCHEMA = `
  CREATE TABLE IF NOT EXISTS media_buyers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    start_date TEXT,
    platforms TEXT NOT NULL DEFAULT '[]',
    monthly_budget INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_media_buyers_active ON media_buyers(active);

  CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    source TEXT NOT NULL DEFAULT 'manual',
    external_id TEXT,
    utm_campaign TEXT,
    media_buyer_id TEXT REFERENCES media_buyers(id) ON DELETE SET NULL,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    landing_page TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON marketing_campaigns(platform);
  CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
  CREATE INDEX IF NOT EXISTS idx_campaigns_buyer ON marketing_campaigns(media_buyer_id);
  CREATE INDEX IF NOT EXISTS idx_campaigns_product ON marketing_campaigns(product_id);
  CREATE INDEX IF NOT EXISTS idx_campaigns_utm ON marketing_campaigns(utm_campaign);

  CREATE TABLE IF NOT EXISTS ad_spend_entries (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    spend INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER,
    reach INTEGER,
    clicks INTEGER,
    landing_page_views INTEGER,
    platform_purchases INTEGER,
    platform_revenue INTEGER,
    source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(campaign_id, date, source)
  );
  CREATE INDEX IF NOT EXISTS idx_ad_spend_date ON ad_spend_entries(date);
  CREATE INDEX IF NOT EXISTS idx_ad_spend_campaign_date ON ad_spend_entries(campaign_id, date);

  CREATE TABLE IF NOT EXISTS tracking_events (
    id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '',
    product_id TEXT,
    variant_id TEXT,
    order_reference TEXT,
    value INTEGER,
    currency TEXT NOT NULL DEFAULT 'EGP',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    referrer TEXT,
    landing_page TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'website',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_created ON tracking_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_name_created ON tracking_events(event_name, created_at);
  CREATE INDEX IF NOT EXISTS idx_events_session ON tracking_events(session_id);
  CREATE INDEX IF NOT EXISTS idx_events_visitor ON tracking_events(visitor_id);
  CREATE INDEX IF NOT EXISTS idx_events_product ON tracking_events(product_id);
  CREATE INDEX IF NOT EXISTS idx_events_order ON tracking_events(order_reference);
  CREATE INDEX IF NOT EXISTS idx_events_utm_campaign ON tracking_events(utm_campaign);

  CREATE TABLE IF NOT EXISTS order_attribution (
    order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    visitor_id TEXT,
    session_id TEXT,
    first_utm_source TEXT,
    first_utm_medium TEXT,
    first_utm_campaign TEXT,
    first_utm_content TEXT,
    first_utm_term TEXT,
    first_referrer TEXT,
    first_landing_page TEXT,
    last_utm_source TEXT,
    last_utm_medium TEXT,
    last_utm_campaign TEXT,
    last_utm_content TEXT,
    last_utm_term TEXT,
    last_referrer TEXT,
    last_landing_page TEXT,
    campaign_id TEXT REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON order_attribution(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_attribution_last_utm ON order_attribution(last_utm_campaign);
  CREATE INDEX IF NOT EXISTS idx_attribution_first_utm ON order_attribution(first_utm_campaign);

  CREATE TABLE IF NOT EXISTS order_status_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'system'
  );
  CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id, changed_at);
  CREATE INDEX IF NOT EXISTS idx_status_history_changed ON order_status_history(changed_at);

  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
`;

type Migration = { id: string; run: (db: Db) => Promise<void> };

const MIGRATIONS: Migration[] = [
  {
    id: "2026-11-05-marketing-analytics",
    run: async (db) => {
      await db.exec(MARKETING_SCHEMA);
    },
  },
  {
    id: "2026-11-05-product-costs",
    run: async (db) => {
      // COGS is optional: only a cost entered by the owner makes gross profit
      // available. `unit_cost` snapshots the value on the order line so later
      // price/cost edits never rewrite historical profitability.
      const variantColumns = await db
        .prepare("PRAGMA table_info(product_variants)")
        .all<{ name: string }>();
      if (!variantColumns.some((c) => c.name === "cost")) {
        await db.exec("ALTER TABLE product_variants ADD COLUMN cost INTEGER");
      }
      const itemColumns = await db
        .prepare("PRAGMA table_info(order_items)")
        .all<{ name: string }>();
      if (!itemColumns.some((c) => c.name === "unit_cost")) {
        await db.exec("ALTER TABLE order_items ADD COLUMN unit_cost INTEGER");
      }
    },
  },
  {
    id: "2026-11-07-product-coming-soon",
    run: async (db) => {
      // Coming-soon products stay visible in the storefront but cannot be
      // added to the cart or ordered until the owner turns the flag off.
      const productColumns = await db
        .prepare("PRAGMA table_info(products)")
        .all<{ name: string }>();
      if (!productColumns.some((c) => c.name === "coming_soon")) {
        await db.exec(
          "ALTER TABLE products ADD COLUMN coming_soon INTEGER NOT NULL DEFAULT 0",
        );
      }
    },
  },
  {
    id: "2026-11-12-variant-images",
    run: async (db) => {
      // Each sellable size can own its gallery instead of sharing the
      // product-level images. ON DELETE CASCADE keeps the table tidy when a
      // size is removed; the editor rewrites images on every product save.
      await db.exec(`
        CREATE TABLE IF NOT EXISTS product_variant_images (
          id TEXT PRIMARY KEY,
          variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
          src TEXT NOT NULL,
          alt_ar TEXT NOT NULL DEFAULT '',
          alt_en TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_variant_images_variant
          ON product_variant_images(variant_id);
      `);
    },
  },
  {
    id: "2026-11-12-split-product-sizes",
    run: async (db) => {
      // One product per sellable size. A multi-size product is split into one
      // product per variant; the first variant keeps the original product id
      // and slug so existing links and campaign references stay valid.
      const productColumns = await db
        .prepare("PRAGMA table_info(products)")
        .all<{ name: string }>();
      if (!productColumns.some((c) => c.name === "family_slug")) {
        await db.exec("ALTER TABLE products ADD COLUMN family_slug TEXT");
      }

      type ProductRow = {
        id: string;
        slug: string;
        family_slug: string | null;
      };
      type VariantRow = {
        id: string;
        product_id: string;
        size_en: string;
        ml: number;
      };
      type ImageRow = {
        src: string;
        alt_ar: string;
        alt_en: string;
      };

      const [productRows, variantRows, imageRows, variantImageRows] = await Promise.all([
        db
          .prepare(
            "SELECT id, slug, family_slug FROM products ORDER BY sort_order, created_at, id",
          )
          .all<ProductRow>(),
        db
          .prepare(
            "SELECT id, product_id, size_en, ml FROM product_variants ORDER BY sort_order, ml",
          )
          .all<VariantRow>(),
        db
          .prepare(
            "SELECT product_id, src, alt_ar, alt_en FROM product_images ORDER BY sort_order",
          )
          .all<ImageRow & { product_id: string }>(),
        db
          .prepare(
            "SELECT variant_id, src, alt_ar, alt_en FROM product_variant_images ORDER BY sort_order",
          )
          .all<ImageRow & { variant_id: string }>(),
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
      const imagesByVariant = new Map<string, ImageRow[]>();
      for (const image of variantImageRows) {
        const list = imagesByVariant.get(image.variant_id) ?? [];
        list.push(image);
        imagesByVariant.set(image.variant_id, list);
      }

      const usedSlugs = new Set(productRows.map((p) => p.slug));
      const slugify = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      const uniqueSlug = (base: string) => {
        const trimmed = base.slice(0, 120).replace(/-+$/g, "") || "product";
        let candidate = trimmed;
        let n = 2;
        while (usedSlugs.has(candidate)) {
          candidate = `${trimmed.slice(0, 116)}-${n++}`;
        }
        usedSlugs.add(candidate);
        return candidate;
      };

      await db.transaction(async (tx) => {
        let order = 0;

        const writeImages = async (productId: string, images: ImageRow[]) => {
          if (!images.length) return;
          const placeholders = images.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
          const args = images.flatMap((img, index) => [
            randomUUID(),
            productId,
            img.src,
            img.alt_ar,
            img.alt_en,
            index,
            index === 0 ? 1 : 0,
          ]);
          await tx
            .prepare(
              `INSERT INTO product_images (id, product_id, src, alt_ar, alt_en, sort_order, is_primary)
               VALUES ${placeholders}`,
            )
            .run(...args);
        };

        for (const product of productRows) {
          const variants = variantsByProduct.get(product.id) ?? [];
          const family = product.family_slug ?? product.slug;
          await tx
            .prepare("UPDATE products SET family_slug = ? WHERE id = ?")
            .run(family, product.id);

          if (!variants.length) {
            await tx
              .prepare("UPDATE products SET sort_order = ? WHERE id = ?")
              .run(order++, product.id);
            continue;
          }

          // A product's size gallery and its product gallery become one
          // gallery for the resulting single-size product. Size images win
          // because they are the most specific; duplicates are dropped.
          const productImages = imagesByProduct.get(product.id) ?? [];
          const mergedImages = (variantId: string): ImageRow[] => {
            const seen = new Set<string>();
            const merged: ImageRow[] = [];
            for (const img of [
              ...(imagesByVariant.get(variantId) ?? []),
              ...productImages,
            ]) {
              if (seen.has(img.src)) continue;
              seen.add(img.src);
              merged.push(img);
            }
            return merged;
          };

          // The first size keeps this product record (and its slug).
          await tx.prepare("DELETE FROM product_images WHERE product_id = ?").run(product.id);
          await writeImages(product.id, mergedImages(variants[0].id));
          await tx
            .prepare("UPDATE product_variants SET product_id = ?, sort_order = 0 WHERE id = ?")
            .run(product.id, variants[0].id);
          await tx
            .prepare("UPDATE products SET sort_order = ? WHERE id = ?")
            .run(order++, product.id);

          // Every other size becomes its own product. The INSERT ... SELECT
          // copies every descriptive field (names, descriptions, specs,
          // badges, flags, category, timestamps) without listing them here.
          for (let i = 1; i < variants.length; i += 1) {
            const variant = variants[i];
            const newId = randomUUID();
            const sizePart = slugify(variant.size_en) || `${variant.ml}ml`;
            const slug = uniqueSlug(`${product.slug}-${sizePart}`);
            await tx
              .prepare(
                `INSERT INTO products (
                  id, slug, category_id, name_ar, name_en, subtitle_ar, subtitle_en,
                  hook_ar, hook_en, description_ar, description_en, storage_ar, storage_en,
                  badge_ar, badge_en, specs, active, featured, coming_soon, sort_order, sample,
                  low_stock_threshold, family_slug, created_at, updated_at
                )
                SELECT ?, ?, category_id, name_ar, name_en, subtitle_ar, subtitle_en,
                  hook_ar, hook_en, description_ar, description_en, storage_ar, storage_en,
                  badge_ar, badge_en, specs, active, featured, coming_soon, ?, sample,
                  low_stock_threshold, ?, created_at, updated_at
                FROM products WHERE id = ?`,
              )
              .run(newId, slug, order++, family, product.id);

            await tx
              .prepare("UPDATE product_variants SET product_id = ?, sort_order = 0 WHERE id = ?")
              .run(newId, variant.id);
            await writeImages(newId, mergedImages(variant.id));
          }

          // The size galleries now live at product level.
          const ids = variants.map((v) => v.id);
          await tx
            .prepare(
              `DELETE FROM product_variant_images
               WHERE variant_id IN (${ids.map(() => "?").join(", ")})`,
            )
            .run(...ids);
        }

        // Historical order lines and tracking events follow the size to its
        // new product, so per-product sales and views stay intact.
        await tx
          .prepare(
            `UPDATE order_items
             SET product_id = (
               SELECT v.product_id FROM product_variants v
               WHERE v.id = order_items.variant_id
             )
             WHERE variant_id IN (SELECT id FROM product_variants)`,
          )
          .run();
        await tx
          .prepare(
            `UPDATE tracking_events
             SET product_id = (
               SELECT v.product_id FROM product_variants v
               WHERE v.id = tracking_events.variant_id
             )
             WHERE variant_id IS NOT NULL
               AND variant_id IN (SELECT id FROM product_variants)`,
          )
          .run();
      });
    },
  },
];

type Args = readonly unknown[];

/** Both `Client` and `Transaction` can execute a single statement. */
type Executor = Pick<Client, "execute"> | Pick<Transaction, "execute">;

export type Statement = {
  get<T = Record<string, unknown>>(...args: Args): Promise<T | undefined>;
  all<T = Record<string, unknown>>(...args: Args): Promise<T[]>;
  run(...args: Args): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
};

export type Db = {
  prepare(sql: string): Statement;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
};

/** libSQL rejects `undefined`; SQL wants NULL. */
const toValue = (value: unknown): Value => (value === undefined ? null : (value as Value));

/**
 * Rows from libSQL are array-like proxies. Copy them into plain objects with
 * named keys so React server→client serialisation and spreads behave exactly
 * like they did with better-sqlite3.
 */
const toPlainRow = (row: ResultSet["rows"][number], columns: string[]) => {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i += 1) out[columns[i]] = row[i];
  return out;
};

function makeDb(executor: Executor, client: Client): Db {
  const prepare = (sql: string): Statement => {
    const exec = (args: Args) => executor.execute({ sql, args: args.map(toValue) });

    return {
      async get<T = Record<string, unknown>>(...args: Args) {
        const result = await exec(args);
        const row = result.rows[0];
        return row ? (toPlainRow(row, result.columns) as T) : undefined;
      },
      async all<T = Record<string, unknown>>(...args: Args) {
        const result = await exec(args);
        return result.rows.map((row) => toPlainRow(row, result.columns)) as T[];
      },
      async run(...args: Args) {
        const result = await exec(args);
        return {
          changes: result.rowsAffected,
          lastInsertRowid: result.lastInsertRowid ?? 0,
        };
      },
    };
  };

  return {
    prepare,
    async exec(sql) {
      await client.executeMultiple(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const tx = await client.transaction("write");
      try {
        const result = await fn(makeDb(tx, client));
        await tx.commit();
        return result;
      } catch (error) {
        try {
          await tx.rollback();
        } catch {
          // already rolled back / connection gone — nothing left to undo
        }
        throw error;
      } finally {
        try {
          tx.close();
        } catch {
          // ignore double-close
        }
      }
    },
  };
}

async function migrate(db: Db) {
  await db.exec(SCHEMA);

  // Lightweight, idempotent column additions for databases created before
  // the dashboard existed. The two reads are independent — run them together
  // so a cold serverless start pays one round trip fewer.
  const [orderColumns, appliedRows] = await Promise.all([
    db.prepare("PRAGMA table_info(orders)").all<{ name: string }>(),
    db.prepare("SELECT id FROM schema_migrations").all<{ id: string }>(),
  ]);
  const hasColumn = (name: string) => orderColumns.some((c) => c.name === name);
  if (!hasColumn("updated_at")) {
    await db.exec("ALTER TABLE orders ADD COLUMN updated_at TEXT");
  }
  if (!hasColumn("phone2")) {
    await db.exec("ALTER TABLE orders ADD COLUMN phone2 TEXT");
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      author_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      title TEXT,
      body TEXT NOT NULL,
      image_url TEXT,
      verified_order_reference TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_reviews_phone ON reviews(phone);
  `);

  // Versioned schema upgrades. Each migration is applied once per database;
  // every statement itself is also idempotent so a crash mid-run is safe.
  const applied = new Set(appliedRows.map((r) => r.id));
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    await migration.run(db);
    await db
      .prepare("INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)")
      .run(migration.id, new Date().toISOString());
  }
}

/** First-run seed: move the original code catalog into the database. */
async function seed(db: Db) {
  const now = new Date().toISOString();
  // One round trip instead of two separate COUNT queries on every cold start.
  const counts = (await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM categories) AS categories,
         (SELECT COUNT(*) FROM products) AS products`,
    )
    .get<{ categories: number; products: number }>())!;

  if (counts.categories === 0) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO categories (id, slug, name_ar, name_en, sort_order, active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      )
      .run("olive-oil", "olive-oil", "زيت زيتون", "Olive oil", 0, now);
  }

  if (counts.products > 0) return;

  // Mirrors the original `src/lib/products.ts` entry exactly — same ids,
  // slugs, prices and stock — but as one product per size. The three sizes
  // share a family slug so they still cross-link as "other sizes".
  const family = "extra-virgin-olive-oil";
  const nameAr = "زيت زيتون بكر ممتاز";
  const nameEn = "Extra Virgin Olive Oil";
  const subtitleAr = "العبوة الأساسية لمطبخك";
  const subtitleEn = "The everyday kitchen bottle";
  const hookAr = "زيت زيتون بكر ممتاز، بمذاق متوازن يناسب المائدة والطهي اليومي.";
  const hookEn =
    "Extra virgin olive oil with a balanced character for the table and everyday cooking.";
  const descriptionAr = JSON.stringify([
    "زيت زيتون بكر ممتاز، تعتني به آل سليمان من اختيار الزيتون حتى وصوله إلى مائدتك، ليحتفظ بطعمه الأصيل ورائحته الطبيعية.",
    "مناسب للسلطات والتغميس مع الخبز، وأيضًا للطهي اليومي. عبوة زجاجية داكنة تحمي الزيت من الضوء.",
  ]);
  const descriptionEn = JSON.stringify([
    "Extra virgin olive oil, cared for by Alsuliman from olive selection to your table, so it keeps its authentic flavour and natural aroma.",
    "Suited to salads and bread dipping, and to everyday cooking. The dark glass bottle protects the oil from light.",
  ]);
  const storageAr = "يُحفظ في مكان جاف بعيدًا عن الضوء والحرارة، ويُغلق بإحكام بعد الاستخدام.";
  const storageEn = "Store in a dry place away from light and heat, and close tightly after use.";

  const sizes: {
    productId: string;
    slug: string;
    variantId: string;
    sizeAr: string;
    sizeEn: string;
    ml: number;
    price: number;
    stock: number;
    sku: string;
    sortOrder: number;
  }[] = [
    {
      productId: "extra-virgin",
      slug: "extra-virgin-olive-oil",
      variantId: "ev-500",
      sizeAr: "٥٠٠ مل",
      sizeEn: "500 ml",
      ml: 500,
      price: 235,
      stock: 24,
      sku: "SLM-EV-500",
      sortOrder: 0,
    },
    {
      productId: "extra-virgin-750",
      slug: "extra-virgin-olive-oil-750-ml",
      variantId: "ev-750",
      sizeAr: "٧٥٠ مل",
      sizeEn: "750 ml",
      ml: 750,
      price: 330,
      stock: 18,
      sku: "SLM-EV-750",
      sortOrder: 1,
    },
    {
      productId: "extra-virgin-1000",
      slug: "extra-virgin-olive-oil-1-l",
      variantId: "ev-1000",
      sizeAr: "١ لتر",
      sizeEn: "1 L",
      ml: 1000,
      price: 420,
      stock: 12,
      sku: "SLM-EV-1000",
      sortOrder: 2,
    },
  ];

  for (const size of sizes) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO products (
          id, slug, category_id, name_ar, name_en, subtitle_ar, subtitle_en,
          hook_ar, hook_en, description_ar, description_en, storage_ar, storage_en,
          badge_ar, badge_en, specs, active, featured, sort_order, sample,
          low_stock_threshold, family_slug, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 1, 5, ?, ?, ?)`,
      )
      .run(
        size.productId,
        size.slug,
        "olive-oil",
        nameAr,
        nameEn,
        subtitleAr,
        subtitleEn,
        hookAr,
        hookEn,
        descriptionAr,
        descriptionEn,
        storageAr,
        storageEn,
        "بكر ممتاز",
        "Extra virgin",
        JSON.stringify([]),
        size.sortOrder,
        family,
        now,
        now,
      );

    await db
      .prepare(
        `INSERT OR IGNORE INTO product_variants (id, product_id, size_ar, size_en, ml, price, compare_at, stock, sku, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        size.variantId,
        size.productId,
        size.sizeAr,
        size.sizeEn,
        size.ml,
        size.price,
        null,
        size.stock,
        size.sku,
        0,
      );

    await db
      .prepare(
        `INSERT OR IGNORE INTO product_images (id, product_id, src, alt_ar, alt_en, sort_order, is_primary)
         VALUES (?, ?, ?, ?, ?, 0, 1)`,
      )
      .run(
        randomUUID(),
        size.productId,
        "/products/bottle-cutout.png",
        "عبوة زيت زيتون بكر ممتاز من آل سليمان — زجاجة داكنة",
        "Alsuliman extra virgin olive oil bottle — dark glass",
      );
  }
}

/**
 * One client per process. `TURSO_DATABASE_URL` (+ `TURSO_AUTH_TOKEN`) points at
 * the Turso cloud database used in production; without it (local dev, tests)
 * the same code talks to the SQLite file in `data/`.
 */
const globalForDb = globalThis as unknown as { __alsulimanDb?: Promise<Db> };

const isBusyError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const direct = (error as { code?: unknown }).code;
  const cause = (error as { cause?: { code?: unknown } }).cause;
  return direct === "SQLITE_BUSY" || cause?.code === "SQLITE_BUSY";
};

/**
 * Another worker process may hold the write lock while running the same
 * idempotent migration. Wait and retry instead of poisoning the build.
 */
async function withBusyRetry<T>(fn: () => Promise<T>, attempts = 8): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (!isBusyError(error) || attempt >= attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

async function buildDb(): Promise<Db> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  let client: Client;
  if (url) {
    client = createClient({ url, authToken });
  } else {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    client = createClient({ url: `file:${dbFile}` });
    // better-sqlite3 had this on; libSQL's file backend does not.
    try {
      await client.execute("PRAGMA foreign_keys = ON");
    } catch {
      // pragma unsupported — keep going (remote Turso handles this itself)
    }
    // Multiple build workers can open the same file and run the idempotent
    // schema migration at once. Ask SQLite to wait for the writer instead of
    // failing the whole build with SQLITE_BUSY.
    try {
      await client.execute("PRAGMA busy_timeout = 15000");
    } catch {
      // pragma unsupported — the retry below still covers transient locks
    }
  }

  const db = makeDb(client, client);
  await withBusyRetry(() => migrate(db));
  await withBusyRetry(() => seed(db));
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__alsulimanDb) {
    globalForDb.__alsulimanDb = buildDb();
  }
  return globalForDb.__alsulimanDb;
}
