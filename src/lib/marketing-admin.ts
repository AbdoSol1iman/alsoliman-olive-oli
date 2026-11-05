import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type {
  AdSpendEntry,
  Campaign,
  CampaignStatus,
  DataSource,
  MediaBuyer,
  Platform,
} from "./marketing-types";
import { isCampaignStatus, isDataSource, isPlatform } from "./marketing-validation";

export type MediaBuyerInput = {
  fullName: string;
  email: string;
  startDate: string;
  platforms: Platform[];
  monthlyBudget: number;
  notes: string;
  active: boolean;
};

export type CampaignInput = {
  name: string;
  platform: Platform;
  status: CampaignStatus;
  utmCampaign: string;
  mediaBuyerId: string | null;
  productId: string | null;
  landingPage: string;
  notes: string;
  source?: DataSource;
  externalId?: string | null;
};

export type AdSpendInput = {
  campaignId: string;
  date: string;
  spend: number;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  landingPageViews: number | null;
  platformPurchases: number | null;
  platformRevenue: number | null;
  source: DataSource;
  notes: string;
};

const parsePlatforms = (value: unknown): Platform[] => {
  try {
    const parsed = JSON.parse(String(value ?? "[]")) as unknown[];
    return parsed.filter(
      (item): item is Platform => typeof item === "string" && isPlatform(item),
    );
  } catch {
    return [];
  }
};

export async function listMediaBuyers(): Promise<MediaBuyer[]> {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM media_buyers ORDER BY active DESC, full_name")
    .all<Record<string, unknown>>();
  return rows.map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    email: row.email ? String(row.email) : null,
    start_date: row.start_date ? String(row.start_date) : null,
    platforms: parsePlatforms(row.platforms),
    monthly_budget: Number(row.monthly_budget ?? 0),
    notes: String(row.notes ?? ""),
    active: Number(row.active ?? 0) === 1,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function createMediaBuyer(input: MediaBuyerInput): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO media_buyers
        (id, full_name, email, start_date, platforms, monthly_budget, notes, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.fullName,
      input.email || null,
      input.startDate || null,
      JSON.stringify(input.platforms),
      input.monthlyBudget,
      input.notes,
      input.active ? 1 : 0,
      now,
      now,
    );
  return id;
}

export async function updateMediaBuyer(id: string, input: MediaBuyerInput): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE media_buyers
       SET full_name = ?, email = ?, start_date = ?, platforms = ?, monthly_budget = ?,
           notes = ?, active = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.fullName,
      input.email || null,
      input.startDate || null,
      JSON.stringify(input.platforms),
      input.monthlyBudget,
      input.notes,
      input.active ? 1 : 0,
      new Date().toISOString(),
      id,
    );
}

export async function setMediaBuyerActive(id: string, active: boolean): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE media_buyers SET active = ?, updated_at = ? WHERE id = ?")
    .run(active ? 1 : 0, new Date().toISOString(), id);
}

async function assertUtmAvailable(
  db: Awaited<ReturnType<typeof getDb>>,
  utm: string,
  excludeId?: string,
) {
  if (!utm) return;
  const existing = await db
    .prepare(
      "SELECT id FROM marketing_campaigns WHERE LOWER(utm_campaign) = LOWER(?) AND id <> ? LIMIT 1",
    )
    .get<{ id: string }>(utm, excludeId ?? "");
  if (existing) throw new Error("utm_taken");
}

async function resolveReferences(
  db: Awaited<ReturnType<typeof getDb>>,
  input: Pick<CampaignInput, "mediaBuyerId" | "productId">,
) {
  let mediaBuyerId: string | null = null;
  if (input.mediaBuyerId) {
    const exists = await db
      .prepare("SELECT id FROM media_buyers WHERE id = ?")
      .get<{ id: string }>(input.mediaBuyerId);
    mediaBuyerId = exists?.id ?? null;
  }
  let productId: string | null = null;
  if (input.productId) {
    const exists = await db
      .prepare("SELECT id FROM products WHERE id = ?")
      .get<{ id: string }>(input.productId);
    productId = exists?.id ?? null;
  }
  return { mediaBuyerId, productId };
}

export async function createCampaign(input: CampaignInput): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const utm = input.utmCampaign.trim();
  await assertUtmAvailable(db, utm);
  const { mediaBuyerId, productId } = await resolveReferences(db, input);

  await db
    .prepare(
      `INSERT INTO marketing_campaigns
        (id, name, platform, status, source, external_id, utm_campaign, media_buyer_id,
         product_id, landing_page, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name,
      input.platform,
      input.status,
      input.source && isDataSource(input.source) ? input.source : "manual",
      input.externalId ?? null,
      utm || null,
      mediaBuyerId,
      productId,
      input.landingPage,
      input.notes,
      now,
      now,
    );
  return id;
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<void> {
  const db = await getDb();
  const utm = input.utmCampaign.trim();
  await assertUtmAvailable(db, utm, id);
  const { mediaBuyerId, productId } = await resolveReferences(db, input);

  await db
    .prepare(
      `UPDATE marketing_campaigns
       SET name = ?, platform = ?, status = ?, utm_campaign = ?, media_buyer_id = ?,
           product_id = ?, landing_page = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name,
      input.platform,
      input.status,
      utm || null,
      mediaBuyerId,
      productId,
      input.landingPage,
      input.notes,
      new Date().toISOString(),
      id,
    );
}

export async function setCampaignStatus(id: string, status: CampaignStatus): Promise<void> {
  if (!isCampaignStatus(status)) throw new Error("invalid_status");
  const db = await getDb();
  await db
    .prepare("UPDATE marketing_campaigns SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, new Date().toISOString(), id);
}

/**
 * Hard-deleting a campaign that already has spend or attributed orders would
 * rewrite history (and silently detach revenue). Only unused campaigns can be
 * removed; the rest are archived by setting their status to "ended".
 */
export async function deleteCampaign(id: string): Promise<void> {
  const db = await getDb();
  const linked = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM ad_spend_entries WHERE campaign_id = ?) AS spend_entries,
         (SELECT COUNT(*) FROM order_attribution WHERE campaign_id = ?) AS attributed_orders`,
    )
    .get<{ spend_entries: number; attributed_orders: number }>(id, id);
  if (Number(linked?.spend_entries ?? 0) > 0 || Number(linked?.attributed_orders ?? 0) > 0) {
    throw new Error("campaign_in_use");
  }
  await db.prepare("DELETE FROM marketing_campaigns WHERE id = ?").run(id);
}

export async function listSpendEntries(
  range: { from: string; to: string },
  campaignId?: string,
): Promise<AdSpendEntry[]> {
  const db = await getDb();
  const where = ["se.date >= ?", "se.date <= ?"];
  const params: unknown[] = [range.from, range.to];
  if (campaignId) {
    where.push("se.campaign_id = ?");
    params.push(campaignId);
  }
  const rows = await db
    .prepare(
      `SELECT se.*, c.name AS campaign_name, c.platform AS campaign_platform
       FROM ad_spend_entries se
       JOIN marketing_campaigns c ON c.id = se.campaign_id
       WHERE ${where.join(" AND ")}
       ORDER BY se.date DESC, c.name
       LIMIT 500`,
    )
    .all<Record<string, unknown>>(...params);

  return rows.map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    campaign_name: String(row.campaign_name),
    platform: (isPlatform(String(row.campaign_platform)) ? row.campaign_platform : "other") as Platform,
    date: String(row.date),
    spend: Number(row.spend ?? 0),
    impressions: row.impressions === null ? null : Number(row.impressions),
    reach: row.reach === null ? null : Number(row.reach),
    clicks: row.clicks === null ? null : Number(row.clicks),
    landing_page_views:
      row.landing_page_views === null ? null : Number(row.landing_page_views),
    platform_purchases:
      row.platform_purchases === null ? null : Number(row.platform_purchases),
    platform_revenue: row.platform_revenue === null ? null : Number(row.platform_revenue),
    source: (isDataSource(String(row.source)) ? row.source : "manual") as DataSource,
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function upsertAdSpend(input: AdSpendInput): Promise<string> {
  const db = await getDb();
  const campaign = await db
    .prepare("SELECT id FROM marketing_campaigns WHERE id = ?")
    .get<{ id: string }>(input.campaignId);
  if (!campaign) throw new Error("campaign_not_found");

  const now = new Date().toISOString();
  const existing = await db
    .prepare(
      "SELECT id FROM ad_spend_entries WHERE campaign_id = ? AND date = ? AND source = ?",
    )
    .get<{ id: string }>(input.campaignId, input.date, input.source);

  if (existing) {
    await db
      .prepare(
        `UPDATE ad_spend_entries
         SET spend = ?, impressions = ?, reach = ?, clicks = ?, landing_page_views = ?,
             platform_purchases = ?, platform_revenue = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.spend,
        input.impressions,
        input.reach,
        input.clicks,
        input.landingPageViews,
        input.platformPurchases,
        input.platformRevenue,
        input.notes,
        now,
        existing.id,
      );
    return existing.id;
  }

  const id = randomUUID();
  await db
    .prepare(
      `INSERT INTO ad_spend_entries
        (id, campaign_id, date, spend, impressions, reach, clicks, landing_page_views,
         platform_purchases, platform_revenue, source, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.campaignId,
      input.date,
      input.spend,
      input.impressions,
      input.reach,
      input.clicks,
      input.landingPageViews,
      input.platformPurchases,
      input.platformRevenue,
      input.source,
      input.notes,
      now,
      now,
    );
  return id;
}

export async function deleteAdSpend(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM ad_spend_entries WHERE id = ?").run(id);
}

export async function listCampaignOptions(): Promise<Campaign[]> {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT c.*, b.full_name AS media_buyer_name, p.name_ar AS product_name
       FROM marketing_campaigns c
       LEFT JOIN media_buyers b ON b.id = c.media_buyer_id
       LEFT JOIN products p ON p.id = c.product_id
       ORDER BY c.name`,
    )
    .all<Record<string, unknown>>();

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    platform: (isPlatform(String(row.platform)) ? row.platform : "other") as Platform,
    status: (isCampaignStatus(String(row.status)) ? row.status : "draft") as CampaignStatus,
    source: (isDataSource(String(row.source)) ? row.source : "manual") as DataSource,
    external_id: row.external_id ? String(row.external_id) : null,
    utm_campaign: row.utm_campaign ? String(row.utm_campaign) : null,
    media_buyer_id: row.media_buyer_id ? String(row.media_buyer_id) : null,
    media_buyer_name: row.media_buyer_name ? String(row.media_buyer_name) : null,
    product_id: row.product_id ? String(row.product_id) : null,
    product_name: row.product_name ? String(row.product_name) : null,
    landing_page: String(row.landing_page ?? ""),
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}
