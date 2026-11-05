/**
 * Shared marketing vocabulary + view types.
 *
 * This module is intentionally free of `server-only` imports: admin
 * components need the labels and types, while the queries live in
 * `marketing.ts` / `marketing-admin.ts`.
 */

export const PLATFORMS = ["meta", "google", "tiktok", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  meta: "Meta (Facebook / Instagram)",
  google: "Google Ads",
  tiktok: "TikTok Ads",
  other: "منصة أخرى",
};

export const CAMPAIGN_STATUSES = ["active", "paused", "ended", "draft"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  active: "نشطة",
  paused: "متوقفة مؤقتًا",
  ended: "منتهية",
  draft: "مسودة",
};

export const DATA_SOURCES = ["manual", "meta_api", "google_api", "tiktok_api"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  manual: "إدخال يدوي",
  meta_api: "Meta API",
  google_api: "Google API",
  tiktok_api: "TikTok API",
};

export type MediaBuyer = {
  id: string;
  full_name: string;
  email: string | null;
  start_date: string | null;
  platforms: Platform[];
  monthly_budget: number;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  source: DataSource;
  external_id: string | null;
  utm_campaign: string | null;
  media_buyer_id: string | null;
  media_buyer_name: string | null;
  product_id: string | null;
  product_name: string | null;
  landing_page: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type AdSpendEntry = {
  id: string;
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  date: string;
  spend: number;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  landing_page_views: number | null;
  platform_purchases: number | null;
  platform_revenue: number | null;
  source: DataSource;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type KpiFormat = "currency" | "number" | "percent" | "ratio";

export type Kpi = {
  key: string;
  label: string;
  /** null means the source data is not available — never a fabricated zero. */
  value: number | null;
  previous: number | null;
  changePct: number | null;
  format: KpiFormat;
  /** One-line explanation shown under the value. */
  hint: string;
  /** Why the value is unavailable (only when value === null). */
  unavailable?: string;
  /** Which direction is healthy. Defaults to "up"; "none" = neutral. */
  goodDirection?: "up" | "down" | "none";
};

export type AttributionRow = {
  source: string;
  medium: string;
  campaign: string;
  orders: number;
  validOrders: number;
  revenue: number;
  deliveredRevenue: number;
  deliveredOrders: number;
  cancelledOrders: number;
};
