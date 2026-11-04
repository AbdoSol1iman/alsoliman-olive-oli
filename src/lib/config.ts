/**
 * Central brand + commerce configuration.
 *
 * Everything a shop owner should be able to change without touching UI
 * components lives here. Values that are NOT verified for the real business
 * are either empty or flagged — never invented.
 */

const env = (key: string, fallback = "") =>
  (process.env[key] ?? fallback).trim();

export const brand = {
  nameAr: "آل سليمان",
  nameEn: "Alsuliman",
  fullNameAr: "السليمان لزيت الزيتون",
  fullNameEn: "Alsuliman Olive Oil",
  markSublineAr: "زيت زيتون بكر ممتاز",
  markSublineEn: "Extra Virgin Olive Oil",
  taglineAr: "أصالة الزيت.. من قلب الطبيعة",
  taglineEn: "Olive oil, the way nature intended",
  /** Real logo supplied (public/brand/logo.png) — switch to "wordmark" for the old placeholder. */
  logoMode: "image" as "wordmark" | "image",
  logoImage: "/brand/logo.png",
  currency: "EGP",
  currencyAr: "ج.م",
  country: "EG",
};

export const contact = {
  /** Set WHATSAPP_NUMBER in .env (international format, digits only). */
  whatsappNumber: env("NEXT_PUBLIC_WHATSAPP_NUMBER"),
  phoneDisplay: env("NEXT_PUBLIC_PHONE_DISPLAY"),
  email: env("NEXT_PUBLIC_CONTACT_EMAIL"),
  addressAr: env("NEXT_PUBLIC_ADDRESS_AR"),
  /** Social links are only rendered when configured. */
  social: {
    instagram: env("NEXT_PUBLIC_INSTAGRAM_URL"),
    facebook: env("NEXT_PUBLIC_FACEBOOK_URL"),
    tiktok: env("NEXT_PUBLIC_TIKTOK_URL"),
  },
};

export const announcements = {
  ar: [
    "توصيل متاح لجميع محافظات مصر",
    "الشحن يُحسب حسب المحافظة عند إتمام الطلب",
    "زيت زيتون بكر ممتاز — معصور على البارد",
  ],
  en: [
    "Delivery available across all Egyptian governorates",
    "Shipping is calculated by governorate at checkout",
    "Extra virgin olive oil — cold pressed",
  ],
};

/**
 * Shipping rules. Fees are master-configurable and shown to the customer
 * before payment.
 *
 * The customer always pays the selected governorate's fee. The only waivers are
 * the owner's deliberate perks: wholesale quantity (≥ wholesaleMinQty bottles)
 * and an optional free-shipping threshold. A city name never waives shipping.
 */
export const shipping = {
  freeThreshold: null as number | null,
  /** Wholesale = at least this many bottles in one order; ships free. */
  wholesaleMinQty: 12,
  codFee: 0,
  zones: {
    cairo: { ar: "القاهرة", en: "Cairo", fee: 60, days: "1–2" },
    giza: { ar: "الجيزة", en: "Giza", fee: 60, days: "1–2" },
    alexandria: { ar: "الإسكندرية", en: "Alexandria", fee: 70, days: "2–3" },
    qalyubia: { ar: "القليوبية", en: "Qalyubia", fee: 65, days: "2–3" },
    dakahlia: { ar: "الدقهلية", en: "Dakahlia", fee: 75, days: "2–4" },
    sharqia: { ar: "الشرقية", en: "Sharqia", fee: 75, days: "2–4" },
    gharbia: { ar: "الغربية", en: "Gharbia", fee: 75, days: "2–4" },
    monufia: { ar: "المنوفية", en: "Monufia", fee: 75, days: "2–4" },
    beheira: { ar: "البحيرة", en: "Beheira", fee: 80, days: "3–4" },
    kafrElSheikh: { ar: "كفر الشيخ", en: "Kafr El-Sheikh", fee: 80, days: "3–4" },
    damietta: { ar: "دمياط", en: "Damietta", fee: 80, days: "3–4" },
    portSaid: { ar: "بورسعيد", en: "Port Said", fee: 80, days: "3–4" },
    ismailia: { ar: "الإسماعيلية", en: "Ismailia", fee: 80, days: "3–4" },
    suez: { ar: "السويس", en: "Suez", fee: 80, days: "3–4" },
    fayoum: { ar: "الفيوم", en: "Fayoum", fee: 85, days: "3–5" },
    beniSuef: { ar: "بني سويف", en: "Beni Suef", fee: 85, days: "3–5" },
    minya: { ar: "المنيا", en: "Minya", fee: 95, days: "3–5" },
    asyut: { ar: "أسيوط", en: "Asyut", fee: 95, days: "4–5" },
    sohag: { ar: "سوهاج", en: "Sohag", fee: 100, days: "4–6" },
    qena: { ar: "قنا", en: "Qena", fee: 100, days: "4–6" },
    luxor: { ar: "الأقصر", en: "Luxor", fee: 105, days: "4–6" },
    aswan: { ar: "أسوان", en: "Aswan", fee: 110, days: "5–7" },
    redSea: { ar: "البحر الأحمر", en: "Red Sea", fee: 120, days: "5–7" },
    newValley: { ar: "الوادي الجديد", en: "New Valley", fee: 130, days: "5–8" },
    matrouh: { ar: "مطروح", en: "Matrouh", fee: 115, days: "5–7" },
    northSinai: { ar: "شمال سيناء", en: "North Sinai", fee: 130, days: "5–8" },
    southSinai: { ar: "جنوب سيناء", en: "South Sinai", fee: 130, days: "5–8" },
  },
  defaultFee: 90,
  /** Delivery notes shown at checkout — confirm with the owner. */
  notesAr: "يتم تجهيز الطلب خلال ١–٢ يوم عمل، وقد يتغير موعد التوصيل قليلًا حسب المحافظة.",
  notesEn: "Orders are prepared within 1–2 business days; delivery time may vary slightly by governorate.",
};

export type ZoneKey = keyof typeof shipping.zones;

/** Total bottles in an order — the input for the wholesale check. */
export type FeeContext = { governorate: ZoneKey; totalQty: number };

/** True when the order reaches the wholesale quantity threshold. */
export function isWholesale(totalQty: number): boolean {
  return totalQty >= shipping.wholesaleMinQty;
}

/**
 * Single source of truth for the shipping fee — used by the server action
 * (authoritative, re-prices the order) and by the checkout summary preview
 * so what the customer sees is what gets charged.
 */
export function shippingFeeFor({ governorate, totalQty }: FeeContext): number {
  if (isWholesale(totalQty)) return 0;
  return shipping.zones[governorate]?.fee ?? shipping.defaultFee;
}

export const payments = {
  cod: { enabled: true, labelAr: "الدفع عند الاستلام", labelEn: "Cash on delivery" },
  instapay: {
    enabled: env("NEXT_PUBLIC_INSTAPAY_ENABLED") === "true",
    handle: env("NEXT_PUBLIC_INSTAPAY_HANDLE"),
    labelAr: "إنستاباي",
    labelEn: "InstaPay",
    instructionsAr:
      "بعد تأكيد الطلب سنرسل لك بيانات التحويل عبر واتساب، ويتم تأكيد الأوردر بعد وصول المبلغ.",
  },
  gateway: {
    enabled: false,
    provider: "",
  },
};

export const flags = {
  /**
   * Sample catalog = placeholder prices/stock shown while the owner confirms
   * real data. Surfaced in the UI so nothing reads as verified.
   */
  sampleCatalog: process.env.NEXT_PUBLIC_SAMPLE_CATALOG !== "false",
  reviewsEnabled: false,
  newsletterBackend: Boolean(env("NEWSLETTER_WEBHOOK_URL")),
};

export const nav = [
  { href: "/", key: "home" },
  { href: "/shop", key: "shop" },
  { href: "/olive", key: "olive" },
  { href: "/story", key: "story" },
  { href: "/contact", key: "contact" },
] as const;
