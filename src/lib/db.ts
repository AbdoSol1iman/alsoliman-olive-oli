import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const dataDir = process.env.DATABASE_DIR
  ? path.resolve(process.env.DATABASE_DIR)
  : path.join(process.cwd(), "data");
const dbFile = process.env.DATABASE_FILE ?? path.join(dataDir, "store.db");

/** Uploads live next to the database so one persistent volume covers both. */
export const uploadsDir = path.join(dataDir, "uploads");

let db: Database.Database | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
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
    sort_order INTEGER NOT NULL DEFAULT 0,
    sample INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
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
  CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

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
`;

function migrate(database: Database.Database) {
  database.exec(SCHEMA);

  // Lightweight, idempotent column additions for databases created before
  // the dashboard existed.
  const orderColumns = database
    .prepare("PRAGMA table_info(orders)")
    .all() as { name: string }[];
  const hasColumn = (name: string) => orderColumns.some((c) => c.name === name);
  if (!hasColumn("updated_at")) {
    database.exec("ALTER TABLE orders ADD COLUMN updated_at TEXT");
  }
}

/** First-run seed: move the original code catalog into the database. */
function seed(database: Database.Database) {
  const now = new Date().toISOString();
  const categoryCount = database.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number };

  if (categoryCount.n === 0) {
    database
      .prepare(
        `INSERT INTO categories (id, slug, name_ar, name_en, sort_order, active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      )
      .run("olive-oil", "olive-oil", "زيت زيتون", "Olive oil", 0, now);
  }

  const productCount = database.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number };
  if (productCount.n > 0) return;

  // Mirrors the original `src/lib/products.ts` entry exactly — same ids,
  // slugs, prices and stock — so the storefront looks identical after the move.
  const productId = "extra-virgin";
  database
    .prepare(
      `INSERT INTO products (
        id, slug, category_id, name_ar, name_en, subtitle_ar, subtitle_en,
        hook_ar, hook_en, description_ar, description_en, storage_ar, storage_en,
        badge_ar, badge_en, specs, active, featured, sort_order, sample,
        low_stock_threshold, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 1, 5, ?, ?)`,
    )
    .run(
      productId,
      "extra-virgin-olive-oil",
      "olive-oil",
      "زيت زيتون بكر ممتاز",
      "Extra Virgin Olive Oil",
      "العبوة الأساسية لمطبخك",
      "The everyday kitchen bottle",
      "زيت زيتون بكر ممتاز، بمذاق متوازن يناسب المائدة والطهي اليومي.",
      "Extra virgin olive oil with a balanced character for the table and everyday cooking.",
      JSON.stringify([
        "زيت زيتون بكر ممتاز، تعتني به آل سليمان من اختيار الزيتون حتى وصوله إلى مائدتك، ليحتفظ بطعمه الأصيل ورائحته الطبيعية.",
        "مناسب للسلطات والتغميس مع الخبز، وأيضًا للطهي اليومي. عبوة زجاجية داكنة تحمي الزيت من الضوء.",
      ]),
      JSON.stringify([
        "Extra virgin olive oil, cared for by Alsuliman from olive selection to your table, so it keeps its authentic flavour and natural aroma.",
        "Suited to salads and bread dipping, and to everyday cooking. The dark glass bottle protects the oil from light.",
      ]),
      "يُحفظ في مكان جاف بعيدًا عن الضوء والحرارة، ويُغلق بإحكام بعد الاستخدام.",
      "Store in a dry place away from light and heat, and close tightly after use.",
      "بكر ممتاز",
      "Extra virgin",
      JSON.stringify([]),
      now,
      now,
    );

  const variantStmt = database.prepare(
    `INSERT INTO product_variants (id, product_id, size_ar, size_en, ml, price, compare_at, stock, sku, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  variantStmt.run("ev-500", productId, "٥٠٠ مل", "500 ml", 500, 235, null, 24, "SLM-EV-500", 0);
  variantStmt.run("ev-750", productId, "٧٥٠ مل", "750 ml", 750, 330, null, 18, "SLM-EV-750", 1);
  variantStmt.run("ev-1000", productId, "١ لتر", "1 L", 1000, 420, null, 12, "SLM-EV-1000", 2);

  database
    .prepare(
      `INSERT INTO product_images (id, product_id, src, alt_ar, alt_en, sort_order, is_primary)
       VALUES (?, ?, ?, ?, ?, 0, 1)`,
    )
    .run(
      randomUUID(),
      productId,
      "/products/bottle-cutout.png",
      "عبوة زيت زيتون بكر ممتاز من آل سليمان — زجاجة داكنة",
      "Alsuliman extra virgin olive oil bottle — dark glass",
    );
}

export function getDb() {
  if (db) return db;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seed(db);
  return db;
}
