import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { getDb } from "./db";
import { brand, contact, shipping as defaultShipping, payments as defaultPayments, flags as defaultFlags, announcements as defaultAnnouncements, type ZoneKey } from "./config";
import type { CheckoutConfig } from "./fee";

export const SETTINGS_TAG = "settings";

export type ShippingZone = { ar: string; en: string; fee: number; days: string };

export type Settings = {
  store: {
    nameAr: string;
    nameEn: string;
    currency: string;
    currencyAr: string;
    logoPath: string;
  };
  contact: {
    whatsappNumber: string;
    phoneDisplay: string;
    email: string;
    addressAr: string;
    instagram: string;
    facebook: string;
    tiktok: string;
  };
  shipping: {
    zones: Record<string, ShippingZone>;
    defaultFee: number;
    wholesaleMinQty: number;
    codFee: number;
    /** Free shipping when the subtotal reaches this amount (null = off). */
    freeThreshold: number | null;
    notesAr: string;
    notesEn: string;
  };
  tax: {
    enabled: boolean;
    ratePercent: number;
    includedInPrice: boolean;
    noteAr: string;
    noteEn: string;
  };
  seo: {
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
  };
  payments: {
    instapayEnabled: boolean;
    instapayHandle: string;
  };
  flags: {
    sampleCatalog: boolean;
  };
  announcements: {
    ar: string[];
    en: string[];
  };
};

/** Default values = the original code config, so nothing changes on day one. */
export function defaultSettings(): Settings {
  return {
    store: {
      nameAr: brand.nameAr,
      nameEn: brand.nameEn,
      currency: brand.currency,
      currencyAr: brand.currencyAr,
      logoPath: brand.logoImage,
    },
    contact: {
      whatsappNumber: contact.whatsappNumber,
      phoneDisplay: contact.phoneDisplay,
      email: contact.email,
      addressAr: contact.addressAr,
      instagram: contact.social.instagram,
      facebook: contact.social.facebook,
      tiktok: contact.social.tiktok,
    },
    shipping: {
      zones: Object.fromEntries(
        Object.entries(defaultShipping.zones).map(([key, zone]) => [key, { ...zone }]),
      ),
      defaultFee: defaultShipping.defaultFee,
      wholesaleMinQty: defaultShipping.wholesaleMinQty,
      codFee: defaultShipping.codFee,
      freeThreshold: defaultShipping.freeThreshold,
      notesAr: defaultShipping.notesAr,
      notesEn: defaultShipping.notesEn,
    },
    tax: {
      enabled: false,
      ratePercent: 0,
      includedInPrice: true,
      noteAr: "الأسعار تشمل ضريبة القيمة المضافة إن وجدت.",
      noteEn: "Prices include VAT where applicable.",
    },
    seo: {
      titleAr: "آل سليمان | زيت زيتون بكر ممتاز",
      titleEn: "Alsuliman | Extra virgin olive oil",
      descriptionAr:
        "زيت زيتون بكر ممتاز من آل سليمان — عناية بالجودة، طعم أصيل، وتوصيل لجميع محافظات مصر.",
      descriptionEn:
        "Extra virgin olive oil by Alsuliman — care for quality, authentic taste, delivery across Egypt.",
    },
    payments: {
      instapayEnabled: defaultPayments.instapay.enabled,
      instapayHandle: defaultPayments.instapay.handle,
    },
    flags: {
      sampleCatalog: defaultFlags.sampleCatalog,
    },
    announcements: {
      ar: [...defaultAnnouncements.ar],
      en: [...defaultAnnouncements.en],
    },
  };
}

const mergeDeep = <T>(base: T, override: unknown): T => {
  if (override === null || override === undefined) return base;
  if (Array.isArray(base) || typeof base !== "object" || base === null) {
    return override as T;
  }
  if (typeof override !== "object") return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    out[key] = mergeDeep((base as Record<string, unknown>)[key], value);
  }
  return out as T;
};

async function readSettings(): Promise<Settings> {
  const db = await getDb();
  const defaults = defaultSettings();

  // First run: materialise the full default snapshot so the settings screen
  // always has something concrete to edit.
  const count = (await db.prepare("SELECT COUNT(*) AS n FROM settings").get<{ n: number }>())!;
  if (count.n === 0) {
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    );
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(defaults)) {
      await stmt.run(key, JSON.stringify(value), now);
    }
  }

  const rows = await db.prepare("SELECT key, value FROM settings").all<{
    key: string;
    value: string;
  }>();
  let settings = defaults;
  for (const row of rows) {
    if (!(row.key in defaults)) continue;
    // Merge the section value UNDER its section key (same pattern as
    // content.ts) — merging the bare section object at the top level would
    // scatter its fields onto `settings` and never reach `settings[key]`.
    settings = mergeDeep(settings, { [row.key]: JSON.parse(row.value) }) as Settings;
  }
  // A blank WhatsApp number means "not configured yet" — honour the env
  // default even after the first-run snapshot materialised an empty value,
  // so NEXT_PUBLIC_WHATSAPP_NUMBER keeps working as a single config point.
  if (!settings.contact.whatsappNumber) {
    settings.contact.whatsappNumber = contact.whatsappNumber;
  }
  return settings;
}

/**
 * Effective store settings — env/code defaults with database overrides.
 * Cached + tagged: admin saves call `updateTag('settings')` so changes go
 * live immediately without redeployment.
 */
export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  return readSettings();
}

/** Uncached read for the settings screen (renders per-request). */
export const getSettingsAdmin = readSettings;

/** Fresh read — used by order re-pricing (authoritative, bypasses the cache). */
export const readSettingsFresh = readSettings;

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const current = await readSettings();
  await db.transaction(async (tx) => {
    const stmt = tx.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    );
    for (const [key, value] of Object.entries(partial)) {
      if (value === undefined) continue;
      // Store the whole section (merged) so the DB never holds partial junk.
      await stmt.run(key, JSON.stringify(mergeDeep(current[key as keyof Settings], value)), now);
    }
  });
  updateTag(SETTINGS_TAG);
  // Contact/shipping/announcements feed the shared layout — refresh those too.
  updateTag(CONTENT_LAYOUT_TAG);
}

/** Layout-affecting data (contact, announcements) is tagged separately. */
export const CONTENT_LAYOUT_TAG = "layout-content";

export type FeeContext = { governorate: string; totalQty: number; subtotal: number };

export const isWholesale = (settings: Settings, totalQty: number) =>
  totalQty >= settings.shipping.wholesaleMinQty;

/**
 * Single source of truth for the shipping fee — used by the order action
 * (authoritative, re-prices the order) and the checkout preview.
 *
 * The fee is always the selected governorate's zone fee. The only exceptions
 * are the owner's deliberately configured perks: wholesale quantity and an
 * optional free-shipping threshold. (City names never zero the fee — that rule
 * wrongly made Qalyubia orders ship free just because the city said Mansoura.)
 */
export function shippingFeeFor(settings: Settings, { governorate, totalQty, subtotal }: FeeContext): number {
  if (isWholesale(settings, totalQty)) return 0;
  const threshold = settings.shipping.freeThreshold;
  if (threshold !== null && threshold > 0 && subtotal >= threshold) return 0;
  return settings.shipping.zones[governorate]?.fee ?? settings.shipping.defaultFee;
}

export const zoneKeys = (settings: Settings): ZoneKey[] =>
  Object.keys(settings.shipping.zones) as ZoneKey[];

/**
 * The subset of settings the checkout form needs, shaped for the browser.
 * Built server-side so the client never sees unrelated settings.
 */
export function toCheckoutConfig(settings: Settings): CheckoutConfig {
  return {
    zones: settings.shipping.zones,
    defaultFee: settings.shipping.defaultFee,
    wholesaleMinQty: settings.shipping.wholesaleMinQty,
    freeThreshold: settings.shipping.freeThreshold,
    codFee: settings.shipping.codFee,
    instapayEnabled: settings.payments.instapayEnabled,
    instapayHandle: settings.payments.instapayHandle,
    instapayLabelAr: "إنستاباي",
    instapayLabelEn: "InstaPay",
    instapayInstructionsAr:
      "بعد تأكيد الطلب سنرسل لك بيانات التحويل عبر واتساب، ويتم تأكيد الأوردر بعد وصول المبلغ.",
    notesAr: settings.shipping.notesAr,
    notesEn: settings.shipping.notesEn,
  };
}
