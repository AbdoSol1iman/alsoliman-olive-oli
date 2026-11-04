import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { getDb } from "./db";
import { dictionaries, getDictionary, type Dictionary } from "./i18n";
import type { Locale } from "./products";
import { CONTENT_LAYOUT_TAG } from "./settings";

export const CONTENT_TAG = "content";

/** Dictionary sections the owner can edit from the dashboard. */
export const EDITABLE_SECTIONS = [
  "hero",
  "featured",
  "story",
  "why",
  "culinary",
  "reviews",
  "newsletter",
  "footer",
  "about",
  "olive",
  "shippingPage",
  "privacyPage",
  "termsPage",
  "contact",
  "whatsapp",
] as const;

export type ContentSection = (typeof EDITABLE_SECTIONS)[number];

export type SectionOverlay = { ar: unknown; en: unknown };
export type FaqItem = { question: string; answer: string };
export type Banner = {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  cta: string;
  enabled: boolean;
};

export type SiteContent = Record<ContentSection, SectionOverlay> & {
  faq: { ar: FaqItem[]; en: FaqItem[] };
  banners: { ar: Banner[]; en: Banner[] };
  media: { heroImage: string; storyImage: string; whyImage: string };
};

const KEY_PREFIX = "content:";

const mergeDeep = <T>(base: T, override: unknown): T => {
  if (override === null || override === undefined) return base;
  if (Array.isArray(base) || typeof base !== "object" || base === null) return override as T;
  if (typeof override !== "object" || Array.isArray(override)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    out[key] = mergeDeep((base as Record<string, unknown>)[key], value);
  }
  return out as T;
};

function defaultContent(): SiteContent {
  const out = {} as Record<string, SectionOverlay>;
  for (const section of EDITABLE_SECTIONS) {
    out[section] = {
      ar: (dictionaries.ar as unknown as Record<string, unknown>)[section],
      en: (dictionaries.en as unknown as Record<string, unknown>)[section],
    };
  }
  return {
    ...(out as unknown as SiteContent),
    faq: { ar: [], en: [] },
    banners: { ar: [], en: [] },
    media: { heroImage: "", storyImage: "", whyImage: "" },
  };
}

const ALL_KEYS = [...EDITABLE_SECTIONS, "faq", "banners", "media"] as const;

/** Strip anything non-serialisable and cap runaway strings before storing. */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 12) return null;
  if (value === null) return null;
  if (typeof value === "string") return value.slice(0, 4000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => sanitize(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitize(val, depth + 1);
    }
    return out;
  }
  return null;
}

async function readContent(): Promise<SiteContent> {
  const db = await getDb();
  const defaults = defaultContent();

  const rows = await db
    .prepare(`SELECT key, value FROM settings WHERE key LIKE '${KEY_PREFIX}%'`)
    .all<{ key: string; value: string }>();

  let content = defaults;
  for (const row of rows) {
    const section = row.key.slice(KEY_PREFIX.length) as keyof SiteContent;
    if (!ALL_KEYS.includes(section)) continue;
    content = mergeDeep(content, { [section]: JSON.parse(row.value) }) as SiteContent;
  }
  return content;
}

/**
 * Raw editable content (per-section overlays). Cached + tagged so dashboard
 * saves go live on the storefront immediately.
 */
export async function getContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  return readContent();
}

/** Uncached read for the dashboard editors. */
export const getContentAdmin = readContent;

export async function saveContentSection(section: keyof SiteContent, value: unknown): Promise<void> {
  const now = new Date().toISOString();
  const db = await getDb();
  await db
    .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)")
    .run(`${KEY_PREFIX}${section}`, JSON.stringify(sanitize(value)), now);
  updateTag(CONTENT_TAG);
  updateTag(CONTENT_LAYOUT_TAG);
}

/* ------------------------------------------------------------------ */
/* Merged views                                                         */
/* ------------------------------------------------------------------ */

/**
 * The storefront dictionary: the i18n defaults overlaid with whatever the
 * owner has edited in the dashboard. Components keep reading `dict` — they
 * simply pick up the edited copy.
 */
export async function getSiteDictionary(locale: Locale): Promise<Dictionary> {
  const content = await getContent();
  const base = getDictionary(locale);
  const merged: Record<string, unknown> = { ...base };
  for (const section of EDITABLE_SECTIONS) {
    merged[section] = mergeDeep(
      (base as unknown as Record<string, unknown>)[section],
      content[section][locale],
    );
  }
  return merged as unknown as Dictionary;
}

export type SiteExtras = {
  banners: Banner[];
  faq: FaqItem[];
  media: SiteContent["media"];
};

export async function getSiteExtras(locale: Locale): Promise<SiteExtras> {
  const content = await getContent();
  return {
    banners: (content.banners[locale] ?? []).filter((b) => b.enabled),
    faq: content.faq[locale] ?? [],
    media: content.media,
  };
}
