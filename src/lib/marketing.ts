import "server-only";
import { getDb } from "./db";
import { bucketKey, bucketLabel, bucketsForRange, type AnalyticsRange } from "./date-range";
import {
  type AttributionRow,
  type Campaign,
  type CampaignStatus,
  type DataSource,
  type Kpi,
  type MediaBuyer,
  type Platform,
} from "./marketing-types";
import { isCampaignStatus, isDataSource, isPlatform } from "./marketing-validation";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const dayStart = (date: string) => `${date}T00:00:00.000Z`;
const dayEnd = (date: string) => `${date}T23:59:59.999Z`;

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));
const nullable = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);
const changePct = (current: number | null, previous: number | null): number | null => {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const groupingFor = (days: number): "day" | "week" | "month" =>
  days <= 62 ? "day" : days <= 180 ? "week" : "month";

/* ------------------------------------------------------------------ */
/* Overview core                                                       */
/* ------------------------------------------------------------------ */

export type OrderSummary = {
  totalOrders: number;
  validOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  grossRevenue: number;
  deliveredRevenue: number;
  pendingRevenue: number;
};

export type SpendSummary = {
  available: boolean;
  entries: number;
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  landingPageViews: number | null;
  platformPurchases: number | null;
  platformRevenue: number | null;
};

export type CostSummary = {
  lines: number;
  missingCostLines: number;
  deliveredProductRevenue: number;
  deliveredCost: number;
  grossProfit: number | null;
};

export type TrackingSummary = {
  available: boolean;
  events: number;
  visitors: number | null;
  pageviewSessions: number | null;
  productSessions: number | null;
  atcSessions: number | null;
  icSessions: number | null;
  purchaseSessions: number | null;
  viewEvents: number | null;
  atcEvents: number | null;
  icEvents: number | null;
  purchaseEvents: number | null;
  whatsappOpenedOrders: number | null;
};

export type CustomerSummary = {
  newCustomers: number;
  returningCustomers: number;
  distinctCustomers: number;
};

export type OverviewCore = {
  orders: OrderSummary;
  spend: SpendSummary;
  costs: CostSummary;
  tracking: TrackingSummary;
  customers: CustomerSummary;
};

export async function computeOverviewCore(from: string, to: string): Promise<OverviewCore> {
  const db = await getDb();
  const orderParams = [dayStart(from), dayEnd(to)];

  const [orderRow, costRow, spendRow, trackRow, customerRow] = await Promise.all([
    db
      .prepare(
        `SELECT
           COUNT(*) AS total_orders,
           COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN 1 ELSE 0 END), 0) AS valid_orders,
           COALESCE(SUM(CASE WHEN status IN ('confirmed','processing','shipped','delivered') THEN 1 ELSE 0 END), 0) AS confirmed_orders,
           COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered_orders,
           COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
           COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0) AS processing_orders,
           COALESCE(SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END), 0) AS shipped_orders,
           COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END), 0) AS gross_revenue,
           COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS delivered_revenue,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0) AS pending_revenue
         FROM orders
         WHERE created_at >= ? AND created_at <= ?`,
      )
      .get<Record<string, number>>(...orderParams),
    db
      .prepare(
        `SELECT
           COUNT(*) AS lines,
           COALESCE(SUM(CASE WHEN oi.unit_cost IS NULL THEN 1 ELSE 0 END), 0) AS missing_lines,
           COALESCE(SUM(oi.unit_price * oi.qty), 0) AS product_revenue,
           COALESCE(SUM(CASE WHEN oi.unit_cost IS NOT NULL THEN oi.unit_cost * oi.qty ELSE 0 END), 0) AS cost
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'delivered' AND o.created_at >= ? AND o.created_at <= ?`,
      )
      .get<Record<string, number>>(...orderParams),
    db
      .prepare(
        `SELECT
           COUNT(*) AS entries,
           COALESCE(SUM(spend), 0) AS spend,
           SUM(impressions) AS impressions,
           SUM(reach) AS reach,
           SUM(clicks) AS clicks,
           SUM(landing_page_views) AS landing_page_views,
           SUM(platform_purchases) AS platform_purchases,
           SUM(platform_revenue) AS platform_revenue
         FROM ad_spend_entries
         WHERE date >= ? AND date <= ?`,
      )
      .get<Record<string, number | null>>(from, to),
    db
      .prepare(
        `SELECT
           COUNT(*) AS events,
           COUNT(DISTINCT CASE WHEN event_name = 'PageView' THEN visitor_id END) AS visitors,
           COUNT(DISTINCT CASE WHEN event_name = 'PageView' THEN session_id END) AS pageview_sessions,
           COUNT(DISTINCT CASE WHEN event_name = 'ViewContent' THEN session_id END) AS product_sessions,
           COUNT(DISTINCT CASE WHEN event_name = 'AddToCart' THEN session_id END) AS atc_sessions,
           COUNT(DISTINCT CASE WHEN event_name = 'InitiateCheckout' THEN session_id END) AS ic_sessions,
           COUNT(DISTINCT CASE WHEN event_name = 'Purchase' THEN session_id END) AS purchase_sessions,
           COALESCE(SUM(CASE WHEN event_name = 'ViewContent' THEN 1 ELSE 0 END), 0) AS view_events,
           COALESCE(SUM(CASE WHEN event_name = 'AddToCart' THEN 1 ELSE 0 END), 0) AS atc_events,
           COALESCE(SUM(CASE WHEN event_name = 'InitiateCheckout' THEN 1 ELSE 0 END), 0) AS ic_events,
           COALESCE(SUM(CASE WHEN event_name = 'Purchase' THEN 1 ELSE 0 END), 0) AS purchase_events,
           COUNT(DISTINCT CASE WHEN event_name = 'WhatsAppOpened' THEN order_reference END) AS whatsapp_orders
         FROM tracking_events
         WHERE created_at >= ? AND created_at <= ?`,
      )
      .get<Record<string, number | null>>(...orderParams),
    db
      .prepare(
        `SELECT
           COUNT(DISTINCT CASE WHEN NOT EXISTS (
             SELECT 1 FROM orders p
             WHERE p.phone = o.phone AND p.status <> 'cancelled' AND p.created_at < ?
           ) THEN o.phone END) AS new_customers,
           COUNT(DISTINCT CASE WHEN EXISTS (
             SELECT 1 FROM orders p
             WHERE p.phone = o.phone AND p.status <> 'cancelled' AND p.created_at < ?
           ) THEN o.phone END) AS returning_customers,
           COUNT(DISTINCT o.phone) AS distinct_customers
         FROM orders o
         WHERE o.status <> 'cancelled' AND o.created_at >= ? AND o.created_at <= ?`,
      )
      .get<Record<string, number>>(dayStart(from), dayStart(from), ...orderParams),
  ]);

  const orders: OrderSummary = {
    totalOrders: num(orderRow?.total_orders),
    validOrders: num(orderRow?.valid_orders),
    confirmedOrders: num(orderRow?.confirmed_orders),
    deliveredOrders: num(orderRow?.delivered_orders),
    cancelledOrders: num(orderRow?.cancelled_orders),
    pendingOrders: num(orderRow?.pending_orders),
    processingOrders: num(orderRow?.processing_orders),
    shippedOrders: num(orderRow?.shipped_orders),
    grossRevenue: num(orderRow?.gross_revenue),
    deliveredRevenue: num(orderRow?.delivered_revenue),
    pendingRevenue: num(orderRow?.pending_revenue),
  };

  const costLines = num(costRow?.lines);
  const missingCostLines = num(costRow?.missing_lines);
  const costs: CostSummary = {
    lines: costLines,
    missingCostLines,
    deliveredProductRevenue: num(costRow?.product_revenue),
    deliveredCost: num(costRow?.cost),
    grossProfit:
      costLines > 0 && missingCostLines === 0
        ? num(costRow?.product_revenue) - num(costRow?.cost)
        : null,
  };

  const spendEntries = num(spendRow?.entries);
  const spend: SpendSummary = {
    available: spendEntries > 0,
    entries: spendEntries,
    spend: spendEntries > 0 ? num(spendRow?.spend) : null,
    impressions: spendEntries > 0 ? nullable(spendRow?.impressions) : null,
    reach: spendEntries > 0 ? nullable(spendRow?.reach) : null,
    clicks: spendEntries > 0 ? nullable(spendRow?.clicks) : null,
    landingPageViews: spendEntries > 0 ? nullable(spendRow?.landing_page_views) : null,
    platformPurchases: spendEntries > 0 ? nullable(spendRow?.platform_purchases) : null,
    platformRevenue: spendEntries > 0 ? nullable(spendRow?.platform_revenue) : null,
  };

  const trackingEvents = num(trackRow?.events);
  const tracking: TrackingSummary = {
    available: trackingEvents > 0,
    events: trackingEvents,
    visitors: trackingEvents > 0 ? num(trackRow?.visitors) : null,
    pageviewSessions: trackingEvents > 0 ? num(trackRow?.pageview_sessions) : null,
    productSessions: trackingEvents > 0 ? num(trackRow?.product_sessions) : null,
    atcSessions: trackingEvents > 0 ? num(trackRow?.atc_sessions) : null,
    icSessions: trackingEvents > 0 ? num(trackRow?.ic_sessions) : null,
    purchaseSessions: trackingEvents > 0 ? num(trackRow?.purchase_sessions) : null,
    viewEvents: trackingEvents > 0 ? num(trackRow?.view_events) : null,
    atcEvents: trackingEvents > 0 ? num(trackRow?.atc_events) : null,
    icEvents: trackingEvents > 0 ? num(trackRow?.ic_events) : null,
    purchaseEvents: trackingEvents > 0 ? num(trackRow?.purchase_events) : null,
    whatsappOpenedOrders: trackingEvents > 0 ? num(trackRow?.whatsapp_orders) : null,
  };

  return {
    orders,
    spend,
    costs,
    tracking,
    customers: {
      newCustomers: num(customerRow?.new_customers),
      returningCustomers: num(customerRow?.returning_customers),
      distinctCustomers: num(customerRow?.distinct_customers),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Funnel                                                              */
/* ------------------------------------------------------------------ */

export type FunnelStage = {
  key: string;
  label: string;
  value: number | null;
  conversionFromPrevious: number | null;
  dropOff: number | null;
  note: string;
  warning?: string;
};

export function buildFunnel(core: OverviewCore): FunnelStage[] {
  const t = core.tracking;
  const o = core.orders;
  const stages: Omit<FunnelStage, "conversionFromPrevious" | "dropOff">[] = [
    {
      key: "visitors",
      label: "زيارات الموقع",
      value: t.pageviewSessions,
      note: "جلسات فريدة سجّلت PageView — وليست زيارات مكررة.",
    },
    {
      key: "product_views",
      label: "مشاهدة المنتجات",
      value: t.productSessions,
      note: "جلسات فريدة شاهدت صفحة منتج (ViewContent).",
    },
    {
      key: "add_to_cart",
      label: "الإضافة للسلة",
      value: t.atcSessions,
      note: "جلسات فريدة أضافت منتجًا للسلة (AddToCart).",
    },
    {
      key: "checkout",
      label: "بدء إتمام الطلب",
      value: t.icSessions,
      note: "جلسات فريدة بدأت إتمام الطلب (InitiateCheckout).",
    },
    {
      key: "orders",
      label: "إنشاء الطلبات",
      value: o.totalOrders,
      note: "عدد الطلبات المسجّلة في قاعدة البيانات — كل الحالات.",
    },
    {
      key: "confirmed",
      label: "الطلبات المؤكدة",
      value: o.confirmedOrders,
      note: "الطلبات التي وصلت إلى «تم التأكيد» أو أبعد حسب حالتها الحالية.",
    },
    {
      key: "delivered",
      label: "الطلبات المُسلّمة",
      value: o.deliveredOrders,
      note: "الطلبات بحالة «تم التوصيل» فقط.",
    },
  ];

  return stages.map((stage, index) => {
    if (index === 0) {
      return { ...stage, conversionFromPrevious: null, dropOff: null };
    }
    const previous = stages[index - 1].value;
    const conversion =
      stage.value !== null && previous !== null && previous > 0
        ? (stage.value / previous) * 100
        : null;
    return {
      ...stage,
      conversionFromPrevious: conversion,
      dropOff: conversion === null ? null : 100 - conversion,
      warning:
        conversion !== null && conversion > 100
          ? "النسبة تتجاوز 100% لأن المراحل الأخيرة تُقاس بالطلبات والمراحل الأولى بالجلسات، أو لوجود فجوة في التتبع."
          : undefined,
    };
  });
}

export async function getFunnel(range: AnalyticsRange) {
  const core = await computeOverviewCore(range.from, range.to);
  return {
    stages: buildFunnel(core),
    trackingAvailable: core.tracking.available,
    orders: core.orders,
  };
}

/* ------------------------------------------------------------------ */
/* Time series                                                         */
/* ------------------------------------------------------------------ */

export type OverviewPoint = {
  key: string;
  label: string;
  orders: number;
  revenue: number;
  deliveredRevenue: number;
  spend: number | null;
};

export async function getOverviewSeries(range: AnalyticsRange): Promise<{
  grouping: "day" | "week" | "month";
  points: OverviewPoint[];
  hasSpend: boolean;
}> {
  const db = await getDb();
  const grouping = groupingFor(range.days);

  const [orderRows, spendRows, spendCount] = await Promise.all([
    db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS day,
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS delivered_revenue
         FROM orders
         WHERE created_at >= ? AND created_at <= ?
         GROUP BY day`,
      )
      .all<Record<string, number | string>>(dayStart(range.from), dayEnd(range.to)),
    db
      .prepare(
        `SELECT date AS day, COALESCE(SUM(spend), 0) AS spend
         FROM ad_spend_entries
         WHERE date >= ? AND date <= ?
         GROUP BY date`,
      )
      .all<{ day: string; spend: number }>(range.from, range.to),
    db
      .prepare("SELECT COUNT(*) AS n FROM ad_spend_entries WHERE date >= ? AND date <= ?")
      .get<{ n: number }>(range.from, range.to),
  ]);

  const hasSpend = num(spendCount?.n) > 0;
  const orderMap = new Map<string, { orders: number; revenue: number; delivered: number }>();
  for (const row of orderRows) {
    const key = bucketKey(String(row.day), grouping);
    const bucket = orderMap.get(key) ?? { orders: 0, revenue: 0, delivered: 0 };
    bucket.orders += num(row.orders);
    bucket.revenue += num(row.revenue);
    bucket.delivered += num(row.delivered_revenue);
    orderMap.set(key, bucket);
  }

  const spendMap = new Map<string, number>();
  for (const row of spendRows) {
    const key = bucketKey(row.day, grouping);
    spendMap.set(key, (spendMap.get(key) ?? 0) + num(row.spend));
  }

  const points = bucketsForRange(range, grouping).map((key) => {
    const orders = orderMap.get(key);
    return {
      key,
      label: bucketLabel(key, grouping),
      orders: orders?.orders ?? 0,
      revenue: orders?.revenue ?? 0,
      deliveredRevenue: orders?.delivered ?? 0,
      spend: hasSpend ? (spendMap.get(key) ?? 0) : null,
    };
  });

  return { grouping, points, hasSpend };
}

/* ------------------------------------------------------------------ */
/* Campaign performance                                                */
/* ------------------------------------------------------------------ */

export type CampaignFilters = {
  platform?: string;
  status?: string;
  campaignId?: string;
};

export type CampaignPerformance = Campaign & {
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  landingPageViews: number | null;
  addToCart: number | null;
  platformPurchases: number | null;
  platformRevenue: number | null;
  frequency: number | null;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  websiteOrders: number;
  validOrders: number;
  websiteRevenue: number;
  deliveredRevenue: number;
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  deliveredProductRevenue: number;
  deliveredCost: number;
  deliveredCostMissing: number;
  grossProfit: number | null;
  cpa: number | null;
  roas: number | null;
  dataSources: DataSource[];
  trackingDataAvailable: boolean;
};

export async function listCampaignRecords(): Promise<Campaign[]> {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT c.*, b.full_name AS media_buyer_name, p.name_ar AS product_name
       FROM marketing_campaigns c
       LEFT JOIN media_buyers b ON b.id = c.media_buyer_id
       LEFT JOIN products p ON p.id = c.product_id
       ORDER BY c.created_at DESC`,
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

export function filterCampaigns(campaigns: Campaign[], filters: CampaignFilters): Campaign[] {
  return campaigns.filter((campaign) => {
    if (filters.platform && campaign.platform !== filters.platform) return false;
    if (filters.status && campaign.status !== filters.status) return false;
    if (filters.campaignId && campaign.id !== filters.campaignId) return false;
    return true;
  });
}

export async function getCampaignPerformance(
  range: AnalyticsRange,
  filters: CampaignFilters = {},
): Promise<CampaignPerformance[]> {
  const db = await getDb();
  const campaigns = filterCampaigns(await listCampaignRecords(), filters);

  const [spendRows, orderRows, costRows, trackingRows, trackingCount] = await Promise.all([
    db
      .prepare(
        `SELECT campaign_id,
                COUNT(*) AS entries,
                COALESCE(SUM(spend), 0) AS spend,
                SUM(impressions) AS impressions,
                SUM(reach) AS reach,
                SUM(clicks) AS clicks,
                SUM(landing_page_views) AS landing_page_views,
                SUM(platform_purchases) AS platform_purchases,
                SUM(platform_revenue) AS platform_revenue,
                GROUP_CONCAT(DISTINCT source) AS sources
         FROM ad_spend_entries
         WHERE date >= ? AND date <= ?
         GROUP BY campaign_id`,
      )
      .all<Record<string, unknown>>(range.from, range.to),
    db
      .prepare(
        `SELECT oa.campaign_id,
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN 1 ELSE 0 END), 0) AS valid_orders,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END), 0) AS delivered_revenue,
                COALESCE(SUM(CASE WHEN o.status IN ('confirmed','processing','shipped','delivered') THEN 1 ELSE 0 END), 0) AS confirmed_orders,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered_orders,
                COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders
         FROM order_attribution oa
         JOIN orders o ON o.id = oa.order_id
         WHERE oa.campaign_id IS NOT NULL AND o.created_at >= ? AND o.created_at <= ?
         GROUP BY oa.campaign_id`,
      )
      .all<Record<string, unknown>>(...[dayStart(range.from), dayEnd(range.to)]),
    db
      .prepare(
        `SELECT oa.campaign_id,
                COUNT(*) AS lines,
                COALESCE(SUM(CASE WHEN oi.unit_cost IS NULL THEN 1 ELSE 0 END), 0) AS missing_lines,
                COALESCE(SUM(oi.unit_price * oi.qty), 0) AS product_revenue,
                COALESCE(SUM(CASE WHEN oi.unit_cost IS NOT NULL THEN oi.unit_cost * oi.qty ELSE 0 END), 0) AS cost
         FROM order_attribution oa
         JOIN orders o ON o.id = oa.order_id
         JOIN order_items oi ON oi.order_id = o.id
         WHERE oa.campaign_id IS NOT NULL AND o.status = 'delivered'
           AND o.created_at >= ? AND o.created_at <= ?
         GROUP BY oa.campaign_id`,
      )
      .all<Record<string, unknown>>(dayStart(range.from), dayEnd(range.to)),
    db
      .prepare(
        `SELECT LOWER(utm_campaign) AS utm,
                COUNT(DISTINCT CASE WHEN event_name = 'PageView' THEN session_id END) AS sessions,
                COUNT(DISTINCT CASE WHEN event_name = 'AddToCart' THEN session_id END) AS atc_sessions
         FROM tracking_events
         WHERE utm_campaign IS NOT NULL AND utm_campaign <> ''
           AND created_at >= ? AND created_at <= ?
         GROUP BY LOWER(utm_campaign)`,
      )
      .all<{ utm: string; sessions: number; atc_sessions: number }>(
        dayStart(range.from),
        dayEnd(range.to),
      ),
    db
      .prepare("SELECT COUNT(*) AS n FROM tracking_events WHERE created_at >= ? AND created_at <= ?")
      .get<{ n: number }>(dayStart(range.from), dayEnd(range.to)),
  ]);

  const spendMap = new Map(spendRows.map((row) => [String(row.campaign_id), row]));
  const orderMap = new Map(orderRows.map((row) => [String(row.campaign_id), row]));
  const costMap = new Map(costRows.map((row) => [String(row.campaign_id), row]));
  const trackingMap = new Map(trackingRows.map((row) => [row.utm, row]));
  const trackingActive = num(trackingCount?.n) > 0;

  return campaigns.map((campaign) => {
    const spendRow = spendMap.get(campaign.id);
    const orderRow = orderMap.get(campaign.id);
    const costRow = costMap.get(campaign.id);
    const utm = campaign.utm_campaign?.trim().toLowerCase() ?? "";
    const trackingRow = utm ? trackingMap.get(utm) : undefined;
    const hasSpend = Boolean(spendRow);

    const spend = hasSpend ? num(spendRow?.spend) : null;
    const impressions = hasSpend ? nullable(spendRow?.impressions) : null;
    const reach = hasSpend ? nullable(spendRow?.reach) : null;
    const clicks = hasSpend ? nullable(spendRow?.clicks) : null;
    const platformPurchases = hasSpend ? nullable(spendRow?.platform_purchases) : null;
    const platformRevenue = hasSpend ? nullable(spendRow?.platform_revenue) : null;
    const trackingDataAvailable = Boolean(utm) && trackingActive;

    const websiteOrders = num(orderRow?.orders);
    const validOrders = num(orderRow?.valid_orders);
    const websiteRevenue = num(orderRow?.revenue);
    const deliveredProductRevenue = num(costRow?.product_revenue);
    const deliveredCost = num(costRow?.cost);
    const deliveredCostMissing = num(costRow?.missing_lines);

    return {
      ...campaign,
      spend,
      impressions,
      reach,
      clicks,
      landingPageViews: trackingDataAvailable ? num(trackingRow?.sessions) : null,
      addToCart: trackingDataAvailable ? num(trackingRow?.atc_sessions) : null,
      platformPurchases,
      platformRevenue,
      frequency: impressions !== null && reach !== null && reach > 0 ? impressions / reach : null,
      cpm: spend !== null && impressions !== null && impressions > 0 ? (spend / impressions) * 1000 : null,
      ctr: clicks !== null && impressions !== null && impressions > 0 ? (clicks / impressions) * 100 : null,
      cpc: spend !== null && clicks !== null && clicks > 0 ? spend / clicks : null,
      websiteOrders,
      validOrders,
      websiteRevenue,
      deliveredRevenue: num(orderRow?.delivered_revenue),
      confirmedOrders: num(orderRow?.confirmed_orders),
      deliveredOrders: num(orderRow?.delivered_orders),
      cancelledOrders: num(orderRow?.cancelled_orders),
      deliveredProductRevenue,
      deliveredCost,
      deliveredCostMissing,
      grossProfit:
        num(costRow?.lines) > 0 && deliveredCostMissing === 0
          ? deliveredProductRevenue - deliveredCost
          : null,
      cpa: spend !== null && websiteOrders > 0 ? spend / websiteOrders : null,
      roas: spend !== null && spend > 0 ? websiteRevenue / spend : null,
      dataSources: String(spendRow?.sources ?? "")
        .split(",")
        .filter((value): value is DataSource => isDataSource(value)),
      trackingDataAvailable,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Media buyers                                                        */
/* ------------------------------------------------------------------ */

export type BuyerTrendPoint = { label: string; spend: number | null; revenue: number };

export type BuyerPerformance = MediaBuyer & {
  campaignCount: number;
  campaigns: { id: string; name: string; platform: Platform; status: CampaignStatus }[];
  spend: number | null;
  revenue: number;
  validOrders: number;
  deliveredRevenue: number;
  purchases: number;
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  grossProfit: number | null;
  estimatedNetProfit: number | null;
  roas: number | null;
  cpa: number | null;
  cpc: number | null;
  ctr: number | null;
  cpm: number | null;
  cancellationRate: number | null;
  deliveryRate: number | null;
  averageOrderValue: number | null;
  budgetUtilization: number | null;
  trackingCoverage: number | null;
  trend: BuyerTrendPoint[];
};

async function buyerTrend(
  campaignIds: string[],
  range: AnalyticsRange,
): Promise<BuyerTrendPoint[]> {
  if (campaignIds.length === 0) return [];
  const db = await getDb();
  const grouping = range.days <= 45 ? "day" : range.days <= 180 ? "week" : "month";
  const keys = bucketsForRange(range, grouping);
  const placeholders = campaignIds.map(() => "?").join(",");

  const [spendRows, revenueRows] = await Promise.all([
    db
      .prepare(
        `SELECT date AS day, COALESCE(SUM(spend), 0) AS spend
         FROM ad_spend_entries
         WHERE campaign_id IN (${placeholders}) AND date >= ? AND date <= ?
         GROUP BY date`,
      )
      .all<{ day: string; spend: number }>(...campaignIds, range.from, range.to),
    db
      .prepare(
        `SELECT substr(o.created_at, 1, 10) AS day,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue
         FROM order_attribution oa
         JOIN orders o ON o.id = oa.order_id
         WHERE oa.campaign_id IN (${placeholders})
           AND o.created_at >= ? AND o.created_at <= ?
         GROUP BY day`,
      )
      .all<{ day: string; revenue: number }>(
        ...campaignIds,
        dayStart(range.from),
        dayEnd(range.to),
      ),
  ]);

  const spendMap = new Map<string, number>();
  for (const row of spendRows) {
    const key = bucketKey(row.day, grouping);
    spendMap.set(key, (spendMap.get(key) ?? 0) + num(row.spend));
  }
  const revenueMap = new Map<string, number>();
  for (const row of revenueRows) {
    const key = bucketKey(row.day, grouping);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + num(row.revenue));
  }
  const hasSpend = spendRows.length > 0;

  return keys.map((key) => ({
    label: bucketLabel(key, grouping),
    spend: hasSpend ? (spendMap.get(key) ?? 0) : null,
    revenue: revenueMap.get(key) ?? 0,
  }));
}

export async function getMediaBuyerPerformance(range: AnalyticsRange): Promise<BuyerPerformance[]> {
  const db = await getDb();
  const [buyerRows, campaigns] = await Promise.all([
    db.prepare("SELECT * FROM media_buyers ORDER BY active DESC, full_name").all<Record<string, unknown>>(),
    getCampaignPerformance(range),
  ]);

  const buyers: MediaBuyer[] = buyerRows.map((row) => {
    const platforms = (() => {
      try {
        const parsed = JSON.parse(String(row.platforms ?? "[]")) as unknown[];
        return parsed.filter((value): value is Platform => typeof value === "string" && isPlatform(value));
      } catch {
        return [];
      }
    })();
    return {
      id: String(row.id),
      full_name: String(row.full_name),
      email: row.email ? String(row.email) : null,
      start_date: row.start_date ? String(row.start_date) : null,
      platforms,
      monthly_budget: num(row.monthly_budget),
      notes: String(row.notes ?? ""),
      active: num(row.active) === 1,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  });

  const result: BuyerPerformance[] = [];
  for (const buyer of buyers) {
    const assigned = campaigns.filter((campaign) => campaign.media_buyer_id === buyer.id);
    const spendCampaigns = assigned.filter((campaign) => campaign.spend !== null);
    const spend =
      spendCampaigns.length > 0
        ? spendCampaigns.reduce((sum, campaign) => sum + (campaign.spend ?? 0), 0)
        : null;
    const revenue = assigned.reduce((sum, campaign) => sum + campaign.websiteRevenue, 0);
    const validOrders = assigned.reduce((sum, campaign) => sum + campaign.validOrders, 0);
    const deliveredRevenue = assigned.reduce((sum, campaign) => sum + campaign.deliveredRevenue, 0);
    const purchases = assigned.reduce((sum, campaign) => sum + campaign.websiteOrders, 0);
    const confirmedOrders = assigned.reduce((sum, campaign) => sum + campaign.confirmedOrders, 0);
    const deliveredOrders = assigned.reduce((sum, campaign) => sum + campaign.deliveredOrders, 0);
    const cancelledOrders = assigned.reduce((sum, campaign) => sum + campaign.cancelledOrders, 0);

    // Aggregate cost metrics only across campaigns where every input exists.
    // Mixing a campaign whose clicks are unknown with one that reports clicks
    // would silently understate CPC/CTR/CPM.
    const clickCampaigns = assigned.filter(
      (campaign) => campaign.spend !== null && campaign.clicks !== null,
    );
    const clickSpend = clickCampaigns.reduce((sum, campaign) => sum + (campaign.spend ?? 0), 0);
    const clicks = clickCampaigns.reduce((sum, campaign) => sum + (campaign.clicks ?? 0), 0);

    const impressionCampaigns = assigned.filter(
      (campaign) => campaign.spend !== null && campaign.impressions !== null,
    );
    const impressionSpend = impressionCampaigns.reduce(
      (sum, campaign) => sum + (campaign.spend ?? 0),
      0,
    );
    const impressions = impressionCampaigns.reduce(
      (sum, campaign) => sum + (campaign.impressions ?? 0),
      0,
    );

    const ctrCampaigns = assigned.filter(
      (campaign) => campaign.clicks !== null && campaign.impressions !== null,
    );
    const ctrClicks = ctrCampaigns.reduce((sum, campaign) => sum + (campaign.clicks ?? 0), 0);
    const ctrImpressions = ctrCampaigns.reduce(
      (sum, campaign) => sum + (campaign.impressions ?? 0),
      0,
    );

    // Delivered revenue without complete cost data must not produce a partial
    // gross-profit number. It stays unavailable until every delivered line has
    // a known cost.
    const deliveredCampaigns = assigned.filter((campaign) => campaign.deliveredOrders > 0);
    const grossProfit =
      deliveredCampaigns.length === 0
        ? null
        : deliveredCampaigns.every((campaign) => campaign.grossProfit !== null)
          ? deliveredCampaigns.reduce((sum, campaign) => sum + (campaign.grossProfit ?? 0), 0)
          : null;

    const resolved = deliveredOrders + cancelledOrders;
    const budgetForPeriod = buyer.monthly_budget * (range.days / 30.44);

    result.push({
      ...buyer,
      campaignCount: assigned.length,
      campaigns: assigned.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
      })),
      spend,
      revenue,
      validOrders,
      deliveredRevenue,
      purchases,
      confirmedOrders,
      deliveredOrders,
      cancelledOrders,
      grossProfit,
      estimatedNetProfit: grossProfit !== null && spend !== null ? grossProfit - spend : null,
      roas: spend !== null && spend > 0 ? revenue / spend : null,
      cpa: spend !== null && purchases > 0 ? spend / purchases : null,
      cpc: clickCampaigns.length > 0 && clicks > 0 ? clickSpend / clicks : null,
      ctr: ctrCampaigns.length > 0 && ctrImpressions > 0 ? (ctrClicks / ctrImpressions) * 100 : null,
      cpm:
        impressionCampaigns.length > 0 && impressions > 0
          ? (impressionSpend / impressions) * 1000
          : null,
      cancellationRate: purchases > 0 ? (cancelledOrders / purchases) * 100 : null,
      deliveryRate: resolved > 0 ? (deliveredOrders / resolved) * 100 : null,
      averageOrderValue: validOrders > 0 ? revenue / validOrders : null,
      budgetUtilization:
        spend !== null && budgetForPeriod > 0 ? (spend / budgetForPeriod) * 100 : null,
      trackingCoverage:
        assigned.length > 0
          ? (assigned.filter((campaign) => campaign.trackingDataAvailable).length / assigned.length) * 100
          : null,
      trend: await buyerTrend(
        assigned.map((campaign) => campaign.id),
        range,
      ),
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Customer acquisition                                                */
/* ------------------------------------------------------------------ */

export type CustomerTrendPoint = {
  key: string;
  label: string;
  newCustomers: number;
  returningCustomers: number;
  orders: number;
  revenue: number;
};

export type CustomerAnalytics = {
  grouping: "day" | "week" | "month";
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
  orders: number;
  revenue: number;
  averageOrderValue: number | null;
  cac: number | null;
  ltv: number | null;
  ltvNote: string;
  repeatPurchaseRate: number | null;
  averageOrdersPerCustomer: number | null;
  revenuePerCustomer: number | null;
  trend: CustomerTrendPoint[];
};

export async function getCustomerAnalytics(
  range: AnalyticsRange,
  grouping: "day" | "week" | "month" = "day",
): Promise<CustomerAnalytics> {
  const db = await getDb();

  const [rangeOrders, firstRows, lifetimeRows, deliveredRow, spendRow] = await Promise.all([
    db
      .prepare(
        `SELECT phone, created_at, total
         FROM orders
         WHERE status <> 'cancelled' AND created_at >= ? AND created_at <= ?`,
      )
      .all<{ phone: string; created_at: string; total: number }>(
        dayStart(range.from),
        dayEnd(range.to),
      ),
    db
      .prepare(
        `SELECT phone, MIN(created_at) AS first_at
         FROM orders
         WHERE status <> 'cancelled' AND created_at <= ?
         GROUP BY phone`,
      )
      .all<{ phone: string; first_at: string }>(dayEnd(range.to)),
    db
      .prepare(
        `SELECT phone, COUNT(*) AS orders
         FROM orders
         WHERE status <> 'cancelled' AND created_at <= ?
         GROUP BY phone`,
      )
      .all<{ phone: string; orders: number }>(dayEnd(range.to)),
    db
      .prepare(
        `SELECT COUNT(*) AS orders,
                COUNT(DISTINCT phone) AS customers,
                MIN(created_at) AS first_at,
                COALESCE(SUM(total), 0) AS revenue
         FROM orders
         WHERE status = 'delivered' AND created_at <= ?`,
      )
      .get<Record<string, unknown>>(dayEnd(range.to)),
    db
      .prepare(
        `SELECT COUNT(*) AS entries, COALESCE(SUM(spend), 0) AS spend
         FROM ad_spend_entries WHERE date >= ? AND date <= ?`,
      )
      .get<{ entries: number; spend: number }>(range.from, range.to),
  ]);

  const firstMap = new Map(firstRows.map((row) => [row.phone, row.first_at]));
  const rangePhones = new Set(rangeOrders.map((order) => order.phone));
  let newCustomers = 0;
  let returningCustomers = 0;
  for (const phone of rangePhones) {
    const first = firstMap.get(phone);
    if (!first) continue;
    if (first.slice(0, 10) >= range.from) newCustomers += 1;
    else returningCustomers += 1;
  }

  const revenue = rangeOrders.reduce((sum, order) => sum + num(order.total), 0);
  const orders = rangeOrders.length;
  const totalCustomers = rangePhones.size;
  const spendEntries = num(spendRow?.entries);
  const spend = spendEntries > 0 ? num(spendRow?.spend) : null;

  const repeatCustomers = lifetimeRows.filter((row) => num(row.orders) >= 2).length;
  const lifetimeCustomers = lifetimeRows.length;

  const deliveredOrders = num(deliveredRow?.orders);
  const deliveredCustomers = num(deliveredRow?.customers);
  const deliveredRevenue = num(deliveredRow?.revenue);
  const firstDeliveredAt = deliveredRow?.first_at ? String(deliveredRow.first_at) : null;
  const historyDays = firstDeliveredAt
    ? Math.max(
        0,
        Math.round(
          (Date.parse(dayEnd(range.to)) - Date.parse(firstDeliveredAt)) / 86_400_000,
        ),
      )
    : 0;

  const ltvAvailable =
    deliveredOrders >= 20 && deliveredCustomers >= 5 && historyDays >= 90;
  const ltv = ltvAvailable ? deliveredRevenue / deliveredCustomers : null;
  const ltvNote = ltvAvailable
    ? "متوسط إيراد التوصيل لكل عميل مُسلّم عبر كامل تاريخ المتجر."
    : deliveredOrders < 20
      ? `يلزم 20 طلبًا مُسلّمًا على الأقل (المتاح: ${deliveredOrders}).`
      : deliveredCustomers < 5
        ? `يلزم 5 عملاء مُسلّمين على الأقل (المتاح: ${deliveredCustomers}).`
        : `يلزم تاريخ توصيل لا يقل عن 90 يومًا (المتاح: ${historyDays} يومًا).`;

  // Acquisition trend: a customer is "new" in the bucket where their first
  // non-cancelled order falls, and "returning" in every later bucket.
  const keys = bucketsForRange(range, grouping);
  const keySet = new Set(keys);
  const newSets = new Map<string, Set<string>>();
  const returningSets = new Map<string, Set<string>>();
  const orderBuckets = new Map<string, { orders: number; revenue: number }>();

  for (const [phone, first] of firstMap.entries()) {
    const firstDay = first.slice(0, 10);
    if (firstDay < range.from || firstDay > range.to) continue;
    const key = bucketKey(firstDay, grouping);
    if (!keySet.has(key)) continue;
    const set = newSets.get(key) ?? new Set<string>();
    set.add(phone);
    newSets.set(key, set);
  }

  for (const order of rangeOrders) {
    const day = order.created_at.slice(0, 10);
    const key = bucketKey(day, grouping);
    if (!keySet.has(key)) continue;
    const bucket = orderBuckets.get(key) ?? { orders: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.revenue += num(order.total);
    orderBuckets.set(key, bucket);

    const first = firstMap.get(order.phone);
    if (first && first.slice(0, 10) < day) {
      const set = returningSets.get(key) ?? new Set<string>();
      set.add(order.phone);
      returningSets.set(key, set);
    }
  }

  const trend: CustomerTrendPoint[] = keys.map((key) => {
    const bucket = orderBuckets.get(key);
    return {
      key,
      label: bucketLabel(key, grouping),
      newCustomers: newSets.get(key)?.size ?? 0,
      returningCustomers: returningSets.get(key)?.size ?? 0,
      orders: bucket?.orders ?? 0,
      revenue: bucket?.revenue ?? 0,
    };
  });

  return {
    grouping,
    newCustomers,
    returningCustomers,
    totalCustomers,
    orders,
    revenue,
    averageOrderValue: orders > 0 ? revenue / orders : null,
    cac: spend !== null && newCustomers > 0 ? spend / newCustomers : null,
    ltv,
    ltvNote,
    repeatPurchaseRate:
      lifetimeCustomers > 0 ? (repeatCustomers / lifetimeCustomers) * 100 : null,
    averageOrdersPerCustomer: totalCustomers > 0 ? orders / totalCustomers : null,
    revenuePerCustomer: totalCustomers > 0 ? revenue / totalCustomers : null,
    trend,
  };
}

/* ------------------------------------------------------------------ */
/* Product marketing                                                   */
/* ------------------------------------------------------------------ */

export type VariantPerformance = {
  id: string;
  name: string;
  /** First image of this size, if it has its own gallery. */
  image: string | null;
  orders: number;
  units: number;
  revenue: number;
  deliveredRevenue: number;
};

export type ProductPerformance = {
  id: string;
  name: string;
  nameEn: string;
  /** First product-level image, used as a fallback for its sizes. */
  image: string | null;
  orders: number;
  cancelledOrders: number;
  units: number;
  revenue: number;
  deliveredRevenue: number;
  deliveredUnits: number;
  spend: number | null;
  roas: number | null;
  views: number | null;
  conversionRate: number | null;
  cancellationRate: number | null;
  variants: VariantPerformance[];
};

export async function getProductPerformance(range: AnalyticsRange): Promise<ProductPerformance[]> {
  const db = await getDb();
  const [
    productRows,
    variantRows,
    viewRows,
    spendRows,
    trackingCount,
    productImageRows,
    variantImageRows,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT oi.product_id,
                MAX(oi.name_ar) AS name_ar,
                MAX(oi.name_en) AS name_en,
                COUNT(DISTINCT o.id) AS orders,
                COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.qty ELSE 0 END), 0) AS units,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.unit_price * oi.qty ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN oi.unit_price * oi.qty ELSE 0 END), 0) AS delivered_revenue,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN oi.qty ELSE 0 END), 0) AS delivered_units
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.created_at >= ? AND o.created_at <= ?
         GROUP BY oi.product_id`,
      )
      .all<Record<string, unknown>>(dayStart(range.from), dayEnd(range.to)),
    db
      .prepare(
        `SELECT oi.product_id, oi.variant_id,
                MAX(oi.size_ar) AS size_ar,
                COUNT(DISTINCT o.id) AS orders,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.qty ELSE 0 END), 0) AS units,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.unit_price * oi.qty ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN oi.unit_price * oi.qty ELSE 0 END), 0) AS delivered_revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.created_at >= ? AND o.created_at <= ?
         GROUP BY oi.product_id, oi.variant_id`,
      )
      .all<Record<string, unknown>>(dayStart(range.from), dayEnd(range.to)),
    db
      .prepare(
        `SELECT product_id, COUNT(DISTINCT session_id) AS sessions
         FROM tracking_events
         WHERE event_name = 'ViewContent' AND product_id IS NOT NULL
           AND created_at >= ? AND created_at <= ?
         GROUP BY product_id`,
      )
      .all<{ product_id: string; sessions: number }>(dayStart(range.from), dayEnd(range.to)),
    db
      .prepare(
        `SELECT c.product_id,
                COUNT(se.id) AS entries,
                COALESCE(SUM(se.spend), 0) AS spend
         FROM marketing_campaigns c
         JOIN ad_spend_entries se ON se.campaign_id = c.id
         WHERE c.product_id IS NOT NULL AND se.date >= ? AND se.date <= ?
         GROUP BY c.product_id`,
      )
      .all<{ product_id: string; entries: number; spend: number }>(range.from, range.to),
    db
      .prepare("SELECT COUNT(*) AS n FROM tracking_events WHERE created_at >= ? AND created_at <= ?")
      .get<{ n: number }>(dayStart(range.from), dayEnd(range.to)),
    db
      .prepare(
        `SELECT product_id, src FROM product_images pi
         WHERE pi.id = (
           SELECT id FROM product_images x
           WHERE x.product_id = pi.product_id
           ORDER BY x.is_primary DESC, x.sort_order ASC, x.id ASC
           LIMIT 1
         )`,
      )
      .all<{ product_id: string; src: string }>(),
    db
      .prepare(
        `SELECT variant_id, src FROM product_variant_images vi
         WHERE vi.id = (
           SELECT id FROM product_variant_images x
           WHERE x.variant_id = vi.variant_id
           ORDER BY x.sort_order ASC, x.id ASC
           LIMIT 1
         )`,
      )
      .all<{ variant_id: string; src: string }>(),
  ]);

  const viewMap = new Map(viewRows.map((row) => [row.product_id, row.sessions]));
  const spendMap = new Map(spendRows.map((row) => [row.product_id, row]));
  const productImageMap = new Map(productImageRows.map((row) => [row.product_id, row.src]));
  const variantImageMap = new Map(variantImageRows.map((row) => [row.variant_id, row.src]));
  const trackingActive = num(trackingCount?.n) > 0;
  const variantsByProduct = new Map<string, VariantPerformance[]>();
  for (const row of variantRows) {
    const productId = String(row.product_id);
    const variantId = String(row.variant_id);
    const list = variantsByProduct.get(productId) ?? [];
    list.push({
      id: variantId,
      name: String(row.size_ar),
      image: variantImageMap.get(variantId) ?? null,
      orders: num(row.orders),
      units: num(row.units),
      revenue: num(row.revenue),
      deliveredRevenue: num(row.delivered_revenue),
    });
    variantsByProduct.set(productId, list);
  }

  return productRows.map((row) => {
    const productId = String(row.product_id);
    const orders = num(row.orders);
    const revenue = num(row.revenue);
    const views = trackingActive ? (viewMap.get(productId) ?? 0) : null;
    const spendRow = spendMap.get(productId);
    const spend = spendRow && num(spendRow.entries) > 0 ? num(spendRow.spend) : null;
    return {
      id: productId,
      name: String(row.name_ar),
      nameEn: String(row.name_en),
      image: productImageMap.get(productId) ?? null,
      orders,
      cancelledOrders: num(row.cancelled_orders),
      units: num(row.units),
      revenue,
      deliveredRevenue: num(row.delivered_revenue),
      deliveredUnits: num(row.delivered_units),
      spend,
      roas: spend !== null && spend > 0 ? revenue / spend : null,
      views,
      conversionRate: views !== null && views > 0 ? (orders / views) * 100 : null,
      cancellationRate: orders > 0 ? (num(row.cancelled_orders) / orders) * 100 : null,
      variants: (variantsByProduct.get(productId) ?? []).sort((a, b) => b.revenue - a.revenue),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Geography                                                           */
/* ------------------------------------------------------------------ */

export type GeographyRow = {
  governorate: string;
  orders: number;
  validOrders: number;
  revenue: number;
  deliveredOrders: number;
  deliveredRevenue: number;
  cancelledOrders: number;
  cancelledRevenue: number;
  averageOrderValue: number | null;
  conversionRate: number | null;
};

export async function getGeography(range: AnalyticsRange): Promise<GeographyRow[]> {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT governorate,
              COUNT(*) AS orders,
              COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN 1 ELSE 0 END), 0) AS valid_orders,
              COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END), 0) AS revenue,
              COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered_orders,
              COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS delivered_revenue,
              COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
              COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total ELSE 0 END), 0) AS cancelled_revenue
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY governorate
       ORDER BY revenue DESC`,
    )
    .all<Record<string, unknown>>(dayStart(range.from), dayEnd(range.to));

  return rows.map((row) => {
    const validOrders = num(row.valid_orders);
    const revenue = num(row.revenue);
    return {
      governorate: String(row.governorate),
      orders: num(row.orders),
      validOrders,
      revenue,
      deliveredOrders: num(row.delivered_orders),
      deliveredRevenue: num(row.delivered_revenue),
      cancelledOrders: num(row.cancelled_orders),
      cancelledRevenue: num(row.cancelled_revenue),
      averageOrderValue: validOrders > 0 ? revenue / validOrders : null,
      // No reliable visitor-location source is captured today. Never infer it
      // from the governorate entered at checkout.
      conversionRate: null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Attribution                                                         */
/* ------------------------------------------------------------------ */

export type AttributionReport = {
  totalOrders: number;
  attributedOrders: number;
  unattributedOrders: number;
  unmatchedCampaignOrders: number;
  matchedCampaignOrders: number;
  last: AttributionRow[];
  first: AttributionRow[];
  referrers: { referrer: string; orders: number; revenue: number }[];
  landingPages: { landingPage: string; orders: number; revenue: number }[];
};

export async function getAttribution(range: AnalyticsRange): Promise<AttributionReport> {
  const db = await getDb();
  const params = [dayStart(range.from), dayEnd(range.to)];

  const groupQuery = (prefix: "first" | "last") => `
    SELECT
      COALESCE(${prefix}_utm_source, '') AS source,
      COALESCE(${prefix}_utm_medium, '') AS medium,
      COALESCE(${prefix}_utm_campaign, '') AS campaign,
      COUNT(*) AS orders,
      COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN 1 ELSE 0 END), 0) AS valid_orders,
      COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END), 0) AS delivered_revenue,
      COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered_orders,
      COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders
    FROM order_attribution oa
    JOIN orders o ON o.id = oa.order_id
    WHERE o.created_at >= ? AND o.created_at <= ?
    GROUP BY ${prefix}_utm_source, ${prefix}_utm_medium, ${prefix}_utm_campaign
    ORDER BY orders DESC`;

  const mapRow = (row: Record<string, unknown>): AttributionRow => ({
    source: String(row.source ?? ""),
    medium: String(row.medium ?? ""),
    campaign: String(row.campaign ?? ""),
    orders: num(row.orders),
    validOrders: num(row.valid_orders),
    revenue: num(row.revenue),
    deliveredRevenue: num(row.delivered_revenue),
    deliveredOrders: num(row.delivered_orders),
    cancelledOrders: num(row.cancelled_orders),
  });

  const [lastRows, firstRows, coverRow, totalRow, referrerRows, landingRows] = await Promise.all([
    db.prepare(groupQuery("last")).all<Record<string, unknown>>(...params),
    db.prepare(groupQuery("first")).all<Record<string, unknown>>(...params),
    db
      .prepare(
        `SELECT
           COUNT(*) AS attributed,
           COALESCE(SUM(CASE WHEN oa.campaign_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS matched,
           COALESCE(SUM(CASE WHEN oa.campaign_id IS NULL AND COALESCE(oa.last_utm_campaign, '') <> '' THEN 1 ELSE 0 END), 0) AS unmatched
         FROM order_attribution oa
         JOIN orders o ON o.id = oa.order_id
         WHERE o.created_at >= ? AND o.created_at <= ?`,
      )
      .get<Record<string, number>>(...params),
    db
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE created_at >= ? AND created_at <= ?")
      .get<{ n: number }>(...params),
    db
      .prepare(
        `SELECT COALESCE(NULLIF(oa.last_referrer, ''), '') AS referrer,
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue
         FROM order_attribution oa
         JOIN orders o ON o.id = oa.order_id
         WHERE o.created_at >= ? AND o.created_at <= ?
         GROUP BY oa.last_referrer
         ORDER BY orders DESC
         LIMIT 20`,
      )
      .all<{ referrer: string; orders: number; revenue: number }>(...params),
    db
      .prepare(
        `SELECT COALESCE(NULLIF(oa.last_landing_page, ''), '') AS landing_page,
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue
         FROM order_attribution oa
         JOIN orders o ON o.id = oa.order_id
         WHERE o.created_at >= ? AND o.created_at <= ?
         GROUP BY oa.last_landing_page
         ORDER BY orders DESC
         LIMIT 20`,
      )
      .all<{ landing_page: string; orders: number; revenue: number }>(...params),
  ]);

  const totalOrders = num(totalRow?.n);
  const attributedOrders = num(coverRow?.attributed);

  return {
    totalOrders,
    attributedOrders,
    unattributedOrders: Math.max(0, totalOrders - attributedOrders),
    unmatchedCampaignOrders: num(coverRow?.unmatched),
    matchedCampaignOrders: num(coverRow?.matched),
    last: lastRows.map(mapRow),
    first: firstRows.map(mapRow),
    referrers: referrerRows.map((row) => ({
      referrer: row.referrer,
      orders: num(row.orders),
      revenue: num(row.revenue),
    })),
    landingPages: landingRows.map((row) => ({
      landingPage: row.landing_page,
      orders: num(row.orders),
      revenue: num(row.revenue),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* COD / order quality                                                 */
/* ------------------------------------------------------------------ */

export type CodAnalytics = {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  confirmedPlusOrders: number;
  grossRevenue: number;
  deliveredRevenue: number;
  pendingRevenue: number;
  cancelledRevenue: number;
  averageOrderValue: number | null;
  deliverySuccessRate: number | null;
  cancellationRate: number | null;
  whatsappOpenedOrders: number | null;
  unreachableCustomers: number | null;
};

export async function getCodAnalytics(range: AnalyticsRange): Promise<CodAnalytics> {
  const db = await getDb();
  const params = [dayStart(range.from), dayEnd(range.to)];

  const [row, waRow, trackingRow] = await Promise.all([
    db
      .prepare(
        `SELECT
           COUNT(*) AS total_orders,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
           COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) AS confirmed_orders,
           COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0) AS processing_orders,
           COALESCE(SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END), 0) AS shipped_orders,
           COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered_orders,
           COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
           COALESCE(SUM(CASE WHEN status IN ('confirmed','processing','shipped','delivered') THEN 1 ELSE 0 END), 0) AS confirmed_plus_orders,
           COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END), 0) AS gross_revenue,
           COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS delivered_revenue,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0) AS pending_revenue,
           COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total ELSE 0 END), 0) AS cancelled_revenue
         FROM orders
         WHERE created_at >= ? AND created_at <= ?`,
      )
      .get<Record<string, number>>(...params),
    db
      .prepare(
        `SELECT COUNT(DISTINCT order_reference) AS n
         FROM tracking_events
         WHERE event_name = 'WhatsAppOpened' AND order_reference IS NOT NULL
           AND created_at >= ? AND created_at <= ?`,
      )
      .get<{ n: number }>(...params),
    db
      .prepare("SELECT COUNT(*) AS n FROM tracking_events WHERE created_at >= ? AND created_at <= ?")
      .get<{ n: number }>(...params),
  ]);

  const totalOrders = num(row?.total_orders);
  const validOrders = totalOrders - num(row?.cancelled_orders);
  const deliveredOrders = num(row?.delivered_orders);
  const cancelledOrders = num(row?.cancelled_orders);
  const resolved = deliveredOrders + cancelledOrders;

  return {
    totalOrders,
    pendingOrders: num(row?.pending_orders),
    confirmedOrders: num(row?.confirmed_orders),
    processingOrders: num(row?.processing_orders),
    shippedOrders: num(row?.shipped_orders),
    deliveredOrders,
    cancelledOrders,
    confirmedPlusOrders: num(row?.confirmed_plus_orders),
    grossRevenue: num(row?.gross_revenue),
    deliveredRevenue: num(row?.delivered_revenue),
    pendingRevenue: num(row?.pending_revenue),
    cancelledRevenue: num(row?.cancelled_revenue),
    averageOrderValue: validOrders > 0 ? num(row?.gross_revenue) / validOrders : null,
    deliverySuccessRate: resolved > 0 ? (deliveredOrders / resolved) * 100 : null,
    cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : null,
    whatsappOpenedOrders: num(trackingRow?.n) > 0 ? num(waRow?.n) : null,
    // There is no "unreachable" status in the order model yet. Rather than
    // inventing one, the report states that it is not tracked.
    unreachableCustomers: null,
  };
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export type Overview = {
  current: OverviewCore;
  previous: OverviewCore;
  financial: Kpi[];
  conversion: Kpi[];
  funnel: FunnelStage[];
  series: { grouping: "day" | "week" | "month"; points: OverviewPoint[]; hasSpend: boolean };
};

export async function getOverview(range: AnalyticsRange): Promise<Overview> {
  const [current, previous, series] = await Promise.all([
    computeOverviewCore(range.from, range.to),
    computeOverviewCore(range.prevFrom, range.prevTo),
    getOverviewSeries(range),
  ]);

  const c = current;
  const p = previous;
  const spendUnavailable = c.spend.available ? undefined : "لم تُسجَّل مصاريف إعلانية لهذه الفترة.";
  const trackingUnavailable = c.tracking.available
    ? undefined
    : "لا توجد أحداث تتبع مسجلة لهذه الفترة — التتبع يبدأ من لحظة تفعيله.";
  const gpUnavailable =
    c.costs.lines === 0
      ? "لا توجد أسطر مُسلّمة لحساب التكلفة."
      : c.costs.missingCostLines > 0
        ? "تكلفة بعض الأصناف المُسلّمة غير مسجلة."
        : undefined;

  const kpi = (
    key: string,
    label: string,
    value: number | null,
    previousValue: number | null,
    format: Kpi["format"],
    hint: string,
    options: {
      unavailable?: string;
      goodDirection?: "up" | "down";
    } = {},
  ): Kpi => ({
    key,
    label,
    value,
    previous: previousValue,
    changePct: changePct(value, previousValue),
    format,
    hint,
    unavailable: value === null ? options.unavailable : undefined,
    goodDirection: options.goodDirection,
  });

  const financial: Kpi[] = [
    kpi(
      "gross_revenue",
      "إجمالي الإيراد",
      c.orders.grossRevenue,
      p.orders.grossRevenue,
      "currency",
      "مجموع إجمالي الطلبات غير الملغاة — يشمل الشحن، وليس الإيراد المُحصّل.",
    ),
    kpi(
      "ad_spend",
      "المصاريف الإعلانية",
      c.spend.spend,
      p.spend.spend,
      "currency",
      "مجموع المصاريف المسجلة يدويًا أو المستوردة من المنصات لهذه الفترة.",
      { unavailable: spendUnavailable },
    ),
    kpi(
      "net_revenue",
      "صافي الإيراد بعد الإعلان",
      c.spend.spend === null ? null : c.orders.grossRevenue - c.spend.spend,
      p.spend.spend === null ? null : p.orders.grossRevenue - p.spend.spend,
      "currency",
      "إجمالي الإيراد − المصاريف الإعلانية. لا يخصم تكلفة المنتجات أو الشحن.",
      { unavailable: spendUnavailable },
    ),
    kpi(
      "gross_profit",
      "الربح الإجمالي (بعد تكلفة المنتجات)",
      c.costs.grossProfit,
      p.costs.grossProfit,
      "currency",
      "إيراد المنتجات المُسلّمة − تكلفة الوحدات المُسلّمة. يظهر فقط عندما تكون كل التكاليف مسجلة.",
      { unavailable: gpUnavailable },
    ),
    kpi(
      "estimated_net_profit",
      "الربح الصافي التقديري",
      c.costs.grossProfit !== null && c.spend.spend !== null
        ? c.costs.grossProfit - c.spend.spend
        : null,
      p.costs.grossProfit !== null && p.spend.spend !== null
        ? p.costs.grossProfit - p.spend.spend
        : null,
      "currency",
      "الربح الإجمالي − المصاريف الإعلانية. تقديري لأنه لا يخصم مصاريف تشغيل أخرى.",
      {
        unavailable:
          gpUnavailable ?? (c.spend.available ? undefined : spendUnavailable),
      },
    ),
    kpi(
      "roas",
      "العائد على الإنفاق الإعلاني (ROAS)",
      c.spend.spend !== null && c.spend.spend > 0 ? c.orders.grossRevenue / c.spend.spend : null,
      p.spend.spend !== null && p.spend.spend > 0 ? p.orders.grossRevenue / p.spend.spend : null,
      "ratio",
      "إجمالي الإيراد ÷ المصاريف الإعلانية. لا يعني الربحية لأن تكلفة المنتجات غير مخصومة.",
      {
        unavailable:
          c.spend.spend === null
            ? spendUnavailable
            : c.spend.spend === 0
              ? "المصاريف المسجلة صفر — لا يمكن حساب العائد."
              : undefined,
      },
    ),
    kpi(
      "marketing_roi",
      "عائد التسويق (Marketing ROI)",
      c.costs.grossProfit !== null && c.spend.spend !== null && c.spend.spend > 0
        ? ((c.costs.grossProfit - c.spend.spend) / c.spend.spend) * 100
        : null,
      p.costs.grossProfit !== null && p.spend.spend !== null && p.spend.spend > 0
        ? ((p.costs.grossProfit - p.spend.spend) / p.spend.spend) * 100
        : null,
      "percent",
      "(الربح الإجمالي − المصاريف الإعلانية) ÷ المصاريف الإعلانية × 100.",
      {
        unavailable:
          c.costs.grossProfit === null
            ? gpUnavailable
            : c.spend.spend === null
              ? spendUnavailable
              : "المصاريف المسجلة صفر — لا يمكن حساب العائد.",
      },
    ),
    kpi(
      "cpa",
      "تكلفة اكتساب العميل (CPA)",
      c.spend.spend !== null && c.customers.newCustomers > 0
        ? c.spend.spend / c.customers.newCustomers
        : null,
      p.spend.spend !== null && p.customers.newCustomers > 0
        ? p.spend.spend / p.customers.newCustomers
        : null,
      "currency",
      "المصاريف الإعلانية ÷ عدد العملاء الجدد (أول طلب غير ملغي لهم داخل الفترة).",
      {
        unavailable:
          c.spend.spend === null
            ? spendUnavailable
            : c.customers.newCustomers === 0
              ? "لا يوجد عملاء جدد في الفترة."
              : undefined,
      },
    ),
    kpi(
      "cpo",
      "تكلفة الطلب (CPO)",
      c.spend.spend !== null && c.orders.totalOrders > 0
        ? c.spend.spend / c.orders.totalOrders
        : null,
      p.spend.spend !== null && p.orders.totalOrders > 0
        ? p.spend.spend / p.orders.totalOrders
        : null,
      "currency",
      "المصاريف الإعلانية ÷ عدد الطلبات المُنشأة (بما فيها الملغاة).",
      {
        unavailable:
          c.spend.spend === null
            ? spendUnavailable
            : c.orders.totalOrders === 0
              ? "لا توجد طلبات في الفترة."
              : undefined,
      },
    ),
    kpi(
      "aov",
      "متوسط قيمة الطلب (AOV)",
      c.orders.validOrders > 0 ? c.orders.grossRevenue / c.orders.validOrders : null,
      p.orders.validOrders > 0 ? p.orders.grossRevenue / p.orders.validOrders : null,
      "currency",
      "إجمالي الإيراد ÷ عدد الطلبات غير الملغاة.",
      {
        unavailable: c.orders.validOrders === 0 ? "لا توجد طلبات غير ملغاة." : undefined,
      },
    ),
  ];

  const cartAbandonment =
    c.tracking.atcSessions !== null &&
    c.tracking.atcSessions > 0 &&
    c.tracking.purchaseSessions !== null
      ? Math.max(0, Math.min(100, (1 - c.tracking.purchaseSessions / c.tracking.atcSessions) * 100))
      : null;
  const previousCartAbandonment =
    p.tracking.atcSessions !== null &&
    p.tracking.atcSessions > 0 &&
    p.tracking.purchaseSessions !== null
      ? Math.max(0, Math.min(100, (1 - p.tracking.purchaseSessions / p.tracking.atcSessions) * 100))
      : null;
  const checkoutAbandonment =
    c.tracking.icSessions !== null &&
    c.tracking.icSessions > 0 &&
    c.tracking.purchaseSessions !== null
      ? Math.max(0, Math.min(100, (1 - c.tracking.purchaseSessions / c.tracking.icSessions) * 100))
      : null;
  const previousCheckoutAbandonment =
    p.tracking.icSessions !== null &&
    p.tracking.icSessions > 0 &&
    p.tracking.purchaseSessions !== null
      ? Math.max(0, Math.min(100, (1 - p.tracking.purchaseSessions / p.tracking.icSessions) * 100))
      : null;

  const conversion: Kpi[] = [
    kpi(
      "visitors",
      "زوار الموقع",
      c.tracking.visitors,
      p.tracking.visitors,
      "number",
      "عدد معرّفات الزوار الفريدة التي سجّلت PageView.",
      { unavailable: trackingUnavailable },
    ),
    kpi(
      "product_views",
      "مشاهدات المنتجات",
      c.tracking.viewEvents,
      p.tracking.viewEvents,
      "number",
      "عدد أحداث ViewContent المسجلة (وليس الزوار الفريدين).",
      { unavailable: trackingUnavailable },
    ),
    kpi(
      "add_to_cart",
      "الإضافات للسلة",
      c.tracking.atcEvents,
      p.tracking.atcEvents,
      "number",
      "عدد أحداث AddToCart المسجلة.",
      { unavailable: trackingUnavailable },
    ),
    kpi(
      "initiated_checkouts",
      "بدء إتمام الطلب",
      c.tracking.icEvents,
      p.tracking.icEvents,
      "number",
      "عدد أحداث InitiateCheckout المسجلة داخل الفترة.",
      { unavailable: trackingUnavailable },
    ),
    kpi(
      "orders_created",
      "الطلبات المُنشأة",
      c.orders.totalOrders,
      p.orders.totalOrders,
      "number",
      "عدد الطلبات المسجلة في قاعدة البيانات بكل الحالات.",
    ),
    kpi(
      "orders_confirmed",
      "الطلبات المؤكدة",
      c.orders.confirmedOrders,
      p.orders.confirmedOrders,
      "number",
      "الطلبات التي وصلت إلى حالة التأكيد أو ما بعدها (حسب الحالة الحالية).",
    ),
    kpi(
      "orders_delivered",
      "الطلبات المُسلّمة",
      c.orders.deliveredOrders,
      p.orders.deliveredOrders,
      "number",
      "الطلبات بحالة «تم التوصيل» فقط — أساس الإيراد المُحقّق.",
    ),
    kpi(
      "orders_cancelled",
      "الطلبات الملغاة",
      c.orders.cancelledOrders,
      p.orders.cancelledOrders,
      "number",
      "الطلبات الملغاة — لا تُحتسب ضمن الإيراد.",
      { goodDirection: "down" },
    ),
    kpi(
      "conversion_rate",
      "معدل التحويل",
      c.tracking.visitors !== null && c.tracking.visitors > 0
        ? (c.orders.totalOrders / c.tracking.visitors) * 100
        : null,
      p.tracking.visitors !== null && p.tracking.visitors > 0
        ? (p.orders.totalOrders / p.tracking.visitors) * 100
        : null,
      "percent",
      "الطلبات المُنشأة ÷ زوار الموقع الفريدين × 100. قد تتأثر بمانع الإعلانات.",
      {
        unavailable: c.tracking.available
          ? "لا يوجد زوار مسجلون في الفترة."
          : trackingUnavailable,
      },
    ),
    kpi(
      "cart_abandonment",
      "معدل ترك السلة",
      cartAbandonment,
      previousCartAbandonment,
      "percent",
      "(جلسات السلة − جلسات الشراء) ÷ جلسات السلة × 100 — بناءً على أحداث التتبع.",
      {
        goodDirection: "down",
        unavailable: c.tracking.available
          ? "لا توجد جلسات إضافة للسلة."
          : trackingUnavailable,
      },
    ),
    kpi(
      "checkout_abandonment",
      "معدل ترك إتمام الطلب",
      checkoutAbandonment,
      previousCheckoutAbandonment,
      "percent",
      "(جلسات بدء الدفع − جلسات الشراء) ÷ جلسات بدء الدفع × 100.",
      {
        goodDirection: "down",
        unavailable: c.tracking.available
          ? "لا توجد جلسات بدء إتمام طلب."
          : trackingUnavailable,
      },
    ),
  ];

  return {
    current,
    previous,
    financial,
    conversion,
    funnel: buildFunnel(c),
    series,
  };
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvFile = (
  title: string,
  range: AnalyticsRange,
  headers: string[],
  rows: (string | number | null)[][],
) => {
  const meta: (string | number)[][] = [
    [title],
    ["من", range.from, "إلى", range.to],
    ["فترة المقارنة", range.prevFrom, "—", range.prevTo],
    [],
    headers,
  ];
  return `\uFEFF${[...meta, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}`;
};

export type MarketingExportType =
  | "overview"
  | "campaigns"
  | "media-buyers"
  | "products"
  | "geography"
  | "cod"
  | "attribution"
  | "customers"
  | "sales";

export const EXPORT_TYPES: { value: MarketingExportType; label: string }[] = [
  { value: "overview", label: "ملخص التسويق" },
  { value: "campaigns", label: "أداء الحملات" },
  { value: "media-buyers", label: "أداء المشترين الإعلاميين" },
  { value: "products", label: "أداء المنتجات" },
  { value: "geography", label: "المحافظات" },
  { value: "cod", label: "جودة طلبات COD" },
  { value: "attribution", label: "الإسناد" },
  { value: "customers", label: "اكتساب العملاء" },
  { value: "sales", label: "المبيعات اليومية" },
];

export async function marketingCsv(
  type: MarketingExportType,
  range: AnalyticsRange,
): Promise<{ filename: string; csv: string }> {
  const stamp = `${range.from}_${range.to}`;

  if (type === "overview") {
    const overview = await getOverview(range);
    const rows: (string | number | null)[][] = [...overview.financial, ...overview.conversion].map(
      (kpi) => [
        kpi.label,
        kpi.value === null ? "" : Number(kpi.value.toFixed(2)),
        kpi.previous === null ? "" : Number(kpi.previous.toFixed(2)),
        kpi.changePct === null ? "" : Number(kpi.changePct.toFixed(2)),
        kpi.hint,
        kpi.value === null ? (kpi.unavailable ?? "غير متاح") : "متاح",
      ],
    );
    return {
      filename: `marketing-overview-${stamp}.csv`,
      csv: csvFile(
        "تقرير التسويق — ملخص المؤشرات",
        range,
        ["المؤشر", "الفترة الحالية", "الفترة السابقة", "التغير %", "الشرح", "الحالة"],
        rows,
      ),
    };
  }

  if (type === "campaigns") {
    const campaigns = await getCampaignPerformance(range);
    return {
      filename: `campaigns-${stamp}.csv`,
      csv: csvFile(
        "تقرير أداء الحملات",
        range,
        [
          "الحملة",
          "المنصة",
          "الحالة",
          "المشتري الإعلامي",
          "المصدر",
          "المصاريف",
          "الظهور",
          "الوصول",
          "التكرار",
          "CPM",
          "النقرات",
          "CTR %",
          "CPC",
          "جلسات الموقع",
          "إضافات السلة",
          "مشتريات المنصة",
          "طلبات الموقع",
          "الطلبات المؤكدة",
          "الطلبات المُسلّمة",
          "الملغاة",
          "CPA",
          "الإيراد",
          "الإيراد المُسلّم",
          "ROAS",
        ],
        campaigns.map((campaign) => [
          campaign.name,
          campaign.platform,
          campaign.status,
          campaign.media_buyer_name ?? "",
          campaign.dataSources.join(" + "),
          campaign.spend,
          campaign.impressions,
          campaign.reach,
          campaign.frequency,
          campaign.cpm,
          campaign.clicks,
          campaign.ctr,
          campaign.cpc,
          campaign.landingPageViews,
          campaign.addToCart,
          campaign.platformPurchases,
          campaign.websiteOrders,
          campaign.confirmedOrders,
          campaign.deliveredOrders,
          campaign.cancelledOrders,
          campaign.cpa,
          campaign.websiteRevenue,
          campaign.deliveredRevenue,
          campaign.roas,
        ]),
      ),
    };
  }

  if (type === "media-buyers") {
    const buyers = await getMediaBuyerPerformance(range);
    return {
      filename: `media-buyers-${stamp}.csv`,
      csv: csvFile(
        "تقرير أداء المشترين الإعلاميين",
        range,
        [
          "الاسم",
          "البريد",
          "الحملات",
          "المصاريف",
          "الإيراد",
          "ROAS",
          "CPA",
          "CPC",
          "CTR %",
          "CPM",
          "المشتريات",
          "المؤكدة",
          "المُسلّمة",
          "الملغاة",
          "معدل الإلغاء %",
          "معدل التوصيل %",
          "AOV",
          "استهلاك الميزانية %",
          "الربح الإجمالي",
          "الربح الصافي التقديري",
          "تغطية التتبع %",
        ],
        buyers.map((buyer) => [
          buyer.full_name,
          buyer.email ?? "",
          buyer.campaignCount,
          buyer.spend,
          buyer.revenue,
          buyer.roas,
          buyer.cpa,
          buyer.cpc,
          buyer.ctr,
          buyer.cpm,
          buyer.purchases,
          buyer.confirmedOrders,
          buyer.deliveredOrders,
          buyer.cancelledOrders,
          buyer.cancellationRate,
          buyer.deliveryRate,
          buyer.averageOrderValue,
          buyer.budgetUtilization,
          buyer.grossProfit,
          buyer.estimatedNetProfit,
          buyer.trackingCoverage,
        ]),
      ),
    };
  }

  if (type === "products") {
    const products = await getProductPerformance(range);
    return {
      filename: `products-${stamp}.csv`,
      csv: csvFile(
        "تقرير أداء المنتجات من منظور التسويق",
        range,
        [
          "المنتج",
          "الطلبات",
          "الوحدات",
          "الإيراد",
          "الإيراد المُسلّم",
          "الملغاة",
          "معدل الإلغاء %",
          "المصاريف الإعلانية",
          "ROAS",
          "مشاهدات المنتج",
          "معدل التحويل %",
        ],
        products.map((product) => [
          product.name,
          product.orders,
          product.units,
          product.revenue,
          product.deliveredRevenue,
          product.cancelledOrders,
          product.cancellationRate,
          product.spend,
          product.roas,
          product.views,
          product.conversionRate,
        ]),
      ),
    };
  }

  if (type === "geography") {
    const rows = await getGeography(range);
    return {
      filename: `geography-${stamp}.csv`,
      csv: csvFile(
        "تقرير المحافظات",
        range,
        [
          "المحافظة",
          "الطلبات",
          "الطلبات غير الملغاة",
          "الإيراد",
          "المُسلّمة",
          "إيراد التوصيل",
          "الملغاة",
          "إيراد الملغاة",
          "AOV",
          "معدل التحويل",
        ],
        rows.map((row) => [
          row.governorate,
          row.orders,
          row.validOrders,
          row.revenue,
          row.deliveredOrders,
          row.deliveredRevenue,
          row.cancelledOrders,
          row.cancelledRevenue,
          row.averageOrderValue,
          "",
        ]),
      ),
    };
  }

  if (type === "cod") {
    const cod = await getCodAnalytics(range);
    return {
      filename: `cod-${stamp}.csv`,
      csv: csvFile(
        "تقرير جودة طلبات COD",
        range,
        ["المؤشر", "القيمة"],
        [
          ["إجمالي الطلبات", cod.totalOrders],
          ["بانتظار التأكيد", cod.pendingOrders],
          ["تم التأكيد", cod.confirmedOrders],
          ["قيد التجهيز", cod.processingOrders],
          ["في الطريق", cod.shippedOrders],
          ["تم التوصيل", cod.deliveredOrders],
          ["ملغي", cod.cancelledOrders],
          ["مؤكد أو أبعد", cod.confirmedPlusOrders],
          ["الإيراد غير الملغي", cod.grossRevenue],
          ["إيراد المُسلّمة", cod.deliveredRevenue],
          ["قيمة المعلّقة", cod.pendingRevenue],
          ["قيمة الملغاة", cod.cancelledRevenue],
          ["AOV", cod.averageOrderValue],
          ["معدل نجاح التوصيل %", cod.deliverySuccessRate],
          ["معدل الإلغاء %", cod.cancellationRate],
          ["فتح رابط واتساب (طلب فريد)", cod.whatsappOpenedOrders],
          ["عملاء غير قابلين للوصول", "غير متتبع"],
        ],
      ),
    };
  }

  if (type === "attribution") {
    const report = await getAttribution(range);
    const header = [
      "نوع اللمسة",
      "المصدر",
      "الوسيط",
      "الحملة",
      "الطلبات",
      "غير الملغاة",
      "الإيراد",
      "إيراد التوصيل",
      "المُسلّمة",
      "الملغاة",
    ];
    const rows: (string | number | null)[][] = [
      ...report.last.map((row) => [
        "آخر لمسة",
        row.source,
        row.medium,
        row.campaign,
        row.orders,
        row.validOrders,
        row.revenue,
        row.deliveredRevenue,
        row.deliveredOrders,
        row.cancelledOrders,
      ]),
      ...report.first.map((row) => [
        "أول لمسة",
        row.source,
        row.medium,
        row.campaign,
        row.orders,
        row.validOrders,
        row.revenue,
        row.deliveredRevenue,
        row.deliveredOrders,
        row.cancelledOrders,
      ]),
    ];
    return {
      filename: `attribution-${stamp}.csv`,
      csv: csvFile("تقرير الإسناد", range, header, rows),
    };
  }

  if (type === "customers") {
    const customers = await getCustomerAnalytics(range, "day");
    const rows: (string | number | null)[][] = customers.trend.map((point) => [
      point.key,
      point.newCustomers,
      point.returningCustomers,
      point.orders,
      point.revenue,
    ]);
    return {
      filename: `customers-${stamp}.csv`,
      csv: csvFile(
        "تقرير اكتساب العملاء",
        range,
        ["التاريخ", "عملاء جدد", "عملاء عائدون", "الطلبات", "الإيراد"],
        [
          ["عملاء جدد", customers.newCustomers, "", "", ""],
          ["عملاء عائدون", customers.returningCustomers, "", "", ""],
          ["CAC", customers.cac, "", "", ""],
          ["LTV", customers.ltv, "", "", customers.ltvNote],
          ["معدل الشراء المتكرر %", customers.repeatPurchaseRate, "", "", ""],
          ["متوسط الطلبات لكل عميل", customers.averageOrdersPerCustomer, "", "", ""],
          ["الإيراد لكل عميل", customers.revenuePerCustomer, "", "", ""],
          [],
          ...rows,
        ],
      ),
    };
  }

  const series = await getOverviewSeries(range);
  return {
    filename: `sales-${stamp}.csv`,
    csv: csvFile(
      "تقرير المبيعات والإيراد",
      range,
      ["الفترة", "الطلبات", "الإيراد", "الإيراد المُسلّم", "المصاريف الإعلانية"],
      series.points.map((point) => [
        point.label,
        point.orders,
        point.revenue,
        point.deliveredRevenue,
        point.spend,
      ]),
    ),
  };
}
