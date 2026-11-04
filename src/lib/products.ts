export type Locale = "ar" | "en";

export type Variant = {
  id: string;
  sizeLabelAr: string;
  sizeLabelEn: string;
  ml: number;
  price: number;
  /** Original price — only set when a real, owner-confirmed discount exists. */
  compareAt: number | null;
  /** null = stock not tracked. */
  stock: number | null;
  sku: string;
};

export type ProductImage = { src: string; altAr: string; altEn: string };

export type ProductSpec = {
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
};

export type Product = {
  id: string;
  slug: string;
  categoryId: string | null;
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  /** Resolved category labels (kept for display convenience in client UI). */
  categoryAr: string;
  categoryEn: string;
  /** Short marketing line — descriptive only, no certifications. */
  hookAr: string;
  hookEn: string;
  descriptionAr: string[];
  descriptionEn: string[];
  images: ProductImage[];
  variants: Variant[];
  /** Specs are only rendered when the owner has provided them. */
  specs: ProductSpec[];
  storageAr: string;
  storageEn: string;
  badgeAr: string | null;
  badgeEn: string | null;
  /** Hidden products disappear from the storefront but keep their data. */
  active: boolean;
  /** Featured products are shown in the homepage grid. */
  featured: boolean;
  sortOrder: number;
  /** true until the owner confirms real pricing for the shop. */
  sample: boolean;
  lowStockThreshold: number;
};

export type Category = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  active: boolean;
};

export const getProduct = (products: Product[], slug: string) =>
  products.find((p) => p.slug === slug);

export const getVariant = (product: Product | undefined, variantId: string) =>
  product?.variants.find((v) => v.id === variantId) ?? null;

/** Every sellable line in the shop, used by the listing grid. */
export type ListingItem = {
  key: string;
  product: Product;
  variant: Variant;
};

/** Shop grid: every variant of every (active) product, smallest size first. */
export const buildListingItems = (products: Product[]): ListingItem[] =>
  products
    .filter((p) => p.active)
    .flatMap((product) =>
      product.variants.map((variant) => ({
        key: `${product.id}:${variant.id}`,
        product,
        variant,
      })),
    )
    .sort((a, b) => a.variant.ml - b.variant.ml);

/** Homepage grid: featured products only (first variant of each). */
export const buildFeaturedItems = (products: Product[]): ListingItem[] =>
  products
    .filter((p) => p.active && p.featured)
    .flatMap((product) =>
      product.variants.map((variant) => ({
        key: `${product.id}:${variant.id}`,
        product,
        variant,
      })),
    )
    .sort((a, b) => a.variant.ml - b.variant.ml);

export const buildSizeFilters = (products: Product[]) =>
  products
    .filter((p) => p.active)
    .flatMap((p) => p.variants.map((v) => v.ml))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => a - b);
