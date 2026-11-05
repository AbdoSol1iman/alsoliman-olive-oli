import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getCampaignPerformance } from "@/lib/marketing";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
} from "@/lib/marketing-types";
import { formatMetric } from "@/lib/marketing-format";
import { formatPrice } from "@/lib/format";
import { AdminCard, EmptyState, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import {
  CampaignStatusBadge,
  PlatformLabel,
  SourceBadge,
} from "@/components/admin/marketing/Badges";

export const instant = false;

export const metadata = { title: "أداء الحملات · Admin" };

const sorts = [
  { value: "revenue", label: "الإيراد (الأعلى)" },
  { value: "spend", label: "المصاريف (الأعلى)" },
  { value: "roas", label: "ROAS (الأعلى)" },
  { value: "cpa", label: "CPA (الأقل)" },
  { value: "orders", label: "طلبات الموقع (الأعلى)" },
];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    platform?: string;
    status?: string;
    campaign?: string;
    sort?: string;
  }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const platform = params.platform ?? "";
  const status = params.status ?? "";
  const campaignId = params.campaign ?? "";
  const sort = params.sort ?? "revenue";

  const allCampaigns = await getCampaignPerformance(range);
  const filtered = allCampaigns.filter((campaign) => {
    if (platform && campaign.platform !== platform) return false;
    if (status && campaign.status !== status) return false;
    if (campaignId && campaign.id !== campaignId) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "spend":
        return (b.spend ?? -1) - (a.spend ?? -1);
      case "roas":
        return (b.roas ?? -1) - (a.roas ?? -1);
      case "cpa":
        return (a.cpa ?? Number.POSITIVE_INFINITY) - (b.cpa ?? Number.POSITIVE_INFINITY);
      case "orders":
        return b.websiteOrders - a.websiteOrders;
      default:
        return b.websiteRevenue - a.websiteRevenue;
    }
  });

  const filters = { platform, status, campaign: campaignId, sort };
  const totals = {
    spend: filtered.reduce((sum, campaign) => sum + (campaign.spend ?? 0), 0),
    revenue: filtered.reduce((sum, campaign) => sum + campaign.websiteRevenue, 0),
    orders: filtered.reduce((sum, campaign) => sum + campaign.websiteOrders, 0),
    withSpend: filtered.some((campaign) => campaign.spend !== null),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">أداء الحملات</h1>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            المصاريف والظهور من البيانات المسجلة، والطلبات والإيراد من إسناد الموقع عبر
            utm_campaign. المصدران مفصولان دائمًا.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "campaigns" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href="/admin/marketing/data"
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory hover:bg-forest-deep"
          >
            + حملة / مصاريف
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/campaigns" extra={filters} />

      <form
        method="get"
        action="/admin/marketing/campaigns"
        className="flex flex-wrap items-end gap-2 border border-gold/20 bg-ivory p-3 print:hidden"
      >
        <input type="hidden" name="preset" value={range.preset} />
        {range.preset === "custom" ? (
          <>
            <input type="hidden" name="from" value={range.from} />
            <input type="hidden" name="to" value={range.to} />
          </>
        ) : null}
        <label className="text-[0.68rem] text-ink-muted">
          المنصة
          <select
            name="platform"
            defaultValue={platform}
            className="mt-1 block h-9 border border-forest/20 bg-ivory px-2 text-[0.75rem] text-charcoal"
          >
            <option value="">الكل</option>
            {PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {PLATFORM_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[0.68rem] text-ink-muted">
          الحالة
          <select
            name="status"
            defaultValue={status}
            className="mt-1 block h-9 border border-forest/20 bg-ivory px-2 text-[0.75rem] text-charcoal"
          >
            <option value="">الكل</option>
            {CAMPAIGN_STATUSES.map((value) => (
              <option key={value} value={value}>
                {CAMPAIGN_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[0.68rem] text-ink-muted">
          الحملة
          <select
            name="campaign"
            defaultValue={campaignId}
            className="mt-1 block h-9 max-w-52 border border-forest/20 bg-ivory px-2 text-[0.75rem] text-charcoal"
          >
            <option value="">الكل</option>
            {allCampaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[0.68rem] text-ink-muted">
          الترتيب
          <select
            name="sort"
            defaultValue={sort}
            className="mt-1 block h-9 border border-forest/20 bg-ivory px-2 text-[0.75rem] text-charcoal"
          >
            {sorts.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-xs bg-forest px-4 text-[0.75rem] text-ivory hover:bg-forest-deep"
        >
          تصفية
        </button>
        <Link
          href={rangeHref("/admin/marketing/campaigns", range)}
          className="inline-flex h-9 items-center rounded-xs border border-forest/20 px-3 text-[0.72rem] text-forest hover:border-forest"
        >
          إعادة تعيين
        </Link>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">المصاريف المسجلة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {totals.withSpend ? formatPrice(totals.spend) : "غير مسجلة"}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">إيراد الموقع المنسوب</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{formatPrice(totals.revenue)}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">طلبات الموقع المنسوبة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{totals.orders}</p>
        </div>
      </div>

      <AdminCard
        title={`${sorted.length} حملة`}
        description="«مشتريات المنصة» و«طلبات الموقع» عمودان منفصلان — لا يُجمعان ولا يُخلطان."
        bodyClassName="p-0"
      >
        {sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="لا توجد حملات مطابقة"
              body="أنشئ حملة من صفحة إدخال البيانات، أو غيّر عوامل التصفية."
            />
          </div>
        ) : (
          <Table className="border-0">
            <thead>
              <tr>
                <Th>الحملة</Th>
                <Th>المنصة</Th>
                <Th>الحالة</Th>
                <Th>المصدر</Th>
                <Th>المصاريف</Th>
                <Th>الظهور</Th>
                <Th>الوصول</Th>
                <Th>التكرار</Th>
                <Th>CPM</Th>
                <Th>النقرات</Th>
                <Th>CTR</Th>
                <Th>CPC</Th>
                <Th>جلسات الموقع</Th>
                <Th>إضافات السلة</Th>
                <Th>مشتريات المنصة</Th>
                <Th>طلبات الموقع</Th>
                <Th>CPA</Th>
                <Th>الإيراد</Th>
                <Th>ROAS</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/12 bg-ivory">
              {sorted.map((campaign) => (
                <tr key={campaign.id} className="align-top hover:bg-cream/30">
                  <Td className="min-w-56">
                    <Link
                      href={`/admin/marketing/data?editCampaign=${campaign.id}`}
                      className="text-forest underline decoration-gold/40 underline-offset-4"
                    >
                      {campaign.name}
                    </Link>
                    <p className="mt-0.5 text-[0.68rem] text-ink-muted">
                      {campaign.media_buyer_name ?? "بدون مشترٍ إعلامي"}
                      {campaign.utm_campaign ? ` · ${campaign.utm_campaign}` : " · بلا UTM"}
                    </p>
                  </Td>
                  <Td>
                    <PlatformLabel platform={campaign.platform} />
                  </Td>
                  <Td>
                    <CampaignStatusBadge status={campaign.status} />
                  </Td>
                  <Td>
                    {campaign.dataSources.length === 0 ? (
                      <span className="text-[0.7rem] text-ink-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {campaign.dataSources.map((source) => (
                          <SourceBadge key={source} source={source} />
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td className="tnum">
                    {campaign.spend === null ? "غير مسجل" : formatPrice(campaign.spend)}
                  </Td>
                  <Td className="tnum">{campaign.impressions ?? "—"}</Td>
                  <Td className="tnum">{campaign.reach ?? "—"}</Td>
                  <Td className="tnum">{formatMetric(campaign.frequency, "ratio")}</Td>
                  <Td className="tnum">{formatMetric(campaign.cpm, "currency")}</Td>
                  <Td className="tnum">{campaign.clicks ?? "—"}</Td>
                  <Td className="tnum">{formatMetric(campaign.ctr, "percent")}</Td>
                  <Td className="tnum">{formatMetric(campaign.cpc, "currency")}</Td>
                  <Td className="tnum">
                    {campaign.landingPageViews === null ? "غير متاح" : campaign.landingPageViews}
                  </Td>
                  <Td className="tnum">
                    {campaign.addToCart === null ? "غير متاح" : campaign.addToCart}
                  </Td>
                  <Td className="tnum">{campaign.platformPurchases ?? "—"}</Td>
                  <Td className="tnum text-forest">{campaign.websiteOrders}</Td>
                  <Td className="tnum">{formatMetric(campaign.cpa, "currency")}</Td>
                  <Td className="tnum text-forest">{formatPrice(campaign.websiteRevenue)}</Td>
                  <Td className="tnum">{formatMetric(campaign.roas, "ratio")}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AdminCard>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        CPM = المصاريف ÷ الظهور × 1000 · CTR = النقرات ÷ الظهور × 100 · CPC = المصاريف ÷
        النقرات · التكرار = الظهور ÷ الوصول · CPA = المصاريف ÷ طلبات الموقع. «جلسات الموقع»
        و«إضافات السلة» تُحسب فقط للحملات التي لها utm_campaign وفترة تتبع نشطة.
      </p>
    </div>
  );
}
