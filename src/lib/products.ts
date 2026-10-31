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

export type Product = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  categoryAr: string;
  categoryEn: string;
  /** Short marketing line — descriptive only, no certifications. */
  hookAr: string;
  hookEn: string;
  descriptionAr: string[];
  descriptionEn: string[];
  images: { src: string; altAr: string; altEn: string }[];
  variants: Variant[];
  /** Specs are only rendered when the owner has provided them. */
  specs: { labelAr: string; labelEn: string; valueAr: string; valueEn: string }[];
  storageAr: string;
  storageEn: string;
  badgeAr: string | null;
  badgeEn: string | null;
  featured: boolean;
  /** true until the owner confirms real pricing for the shop. */
  sample: boolean;
};

const bottleImages = [
  {
    src: "/products/bottle-cutout.png",
    altAr: "عبوة زيت زيتون بكر ممتاز من آل سليمان — زجاجة داكنة",
    altEn: "Alsuliman extra virgin olive oil bottle — dark glass",
  },
];

export const products: Product[] = [
  {
    id: "extra-virgin",
    slug: "extra-virgin-olive-oil",
    nameAr: "زيت زيتون بكر ممتاز",
    nameEn: "Extra Virgin Olive Oil",
    subtitleAr: "العبوة الأساسية لمطبخك",
    subtitleEn: "The everyday kitchen bottle",
    categoryAr: "زيت زيتون",
    categoryEn: "Olive oil",
    hookAr: "زيت زيتون بكر ممتاز، بمذاق متوازن يناسب المائدة والطهي اليومي.",
    hookEn: "Extra virgin olive oil with a balanced character for the table and everyday cooking.",
    descriptionAr: [
      "زيت زيتون بكر ممتاز، تعتني به آل سليمان من اختيار الزيتون حتى وصوله إلى مائدتك، ليحتفظ بطعمه الأصيل ورائحته الطبيعية.",
      "مناسب للسلطات والتغميس مع الخبز، وأيضًا للطهي اليومي. عبوة زجاجية داكنة تحمي الزيت من الضوء.",
    ],
    descriptionEn: [
      "Extra virgin olive oil, cared for by Alsuliman from olive selection to your table, so it keeps its authentic flavour and natural aroma.",
      "Suited to salads and bread dipping, and to everyday cooking. The dark glass bottle protects the oil from light.",
    ],
    images: bottleImages,
    variants: [
      {
        id: "ev-500",
        sizeLabelAr: "٥٠٠ مل",
        sizeLabelEn: "500 ml",
        ml: 500,
        price: 235,
        compareAt: null,
        stock: 24,
        sku: "SLM-EV-500",
      },
      {
        id: "ev-750",
        sizeLabelAr: "٧٥٠ مل",
        sizeLabelEn: "750 ml",
        ml: 750,
        price: 330,
        compareAt: null,
        stock: 18,
        sku: "SLM-EV-750",
      },
      {
        id: "ev-1000",
        sizeLabelAr: "١ لتر",
        sizeLabelEn: "1 L",
        ml: 1000,
        price: 420,
        compareAt: null,
        stock: 12,
        sku: "SLM-EV-1000",
      },
    ],
    specs: [],
    storageAr: "يُحفظ في مكان جاف بعيدًا عن الضوء والحرارة، ويُغلق بإحكام بعد الاستخدام.",
    storageEn: "Store in a dry place away from light and heat, and close tightly after use.",
    badgeAr: "بكر ممتاز",
    badgeEn: "Extra virgin",
    featured: true,
    sample: true,
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export const getVariant = (productId: string, variantId: string) => {
  const product = products.find((p) => p.id === productId);
  return product?.variants.find((v) => v.id === variantId) ?? null;
};

/** Every sellable line in the shop, used by the listing grid. */
export type ListingItem = {
  key: string;
  product: Product;
  variant: Variant;
};

export const listingItems: ListingItem[] = products
  .filter((p) => p.featured)
  .flatMap((product) => product.variants.map((variant) => ({
    key: `${product.id}:${variant.id}`,
    product,
    variant,
  })))
  .sort((a, b) => a.variant.ml - b.variant.ml);

export const sizeFilters = products
  .flatMap((p) => p.variants.map((v) => v.ml))
  .filter((v, i, arr) => arr.indexOf(v) === i)
  .sort((a, b) => a - b);
