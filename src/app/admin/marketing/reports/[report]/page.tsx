import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import {
  getAttribution,
  getCampaignPerformance,
  getCodAnalytics,
  getCustomerAnalytics,
  getGeography,
  getMediaBuyerPerformance,
  getOverview,
  getProductPerformance,
} from "@/lib/marketing";
import { isMarketingReport, marketingReport } from "@/lib/marketing-reports";
import {
  CAMPAIGN_STATUS_LABELS,
  PLATFORM_LABELS,
  type Kpi,
} from "@/lib/marketing-types";
import { changeTone, formatChange, formatMetric } from "@/lib/marketing-format";
import { formatNumber, formatPrice } from "@/lib/format";
import { AdminCard } from "@/components/admin/ui";
import { KpiGrid } from "@/components/admin/marketing/KpiCard";
import {
  CustomerTrendChart,
  FunnelBars,
  HorizontalBarList,
  RevenueSpendChart,
} from "@/components/admin/marketing/Charts";
import { PrintButton } from "@/components/admin/marketing/PrintButton";

export const instant = false;

type Cell = ReactNode;

function ReportTable({
  headers,
  rows,
  empty,
  minWidth = 720,
}: {
  headers: string[];
  rows: Cell[][];
  empty: string;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto border border-gold/20">
      <table
        className="w-full border-collapse text-[0.72rem]"
        style={{ minWidth }}
      >
        <thead>
          <tr className="border-b border-forest/25 bg-cream/40 text-forest">
            {headers.map((header) => (
              <th key={header} className="px-2.5 py-2 text-start font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gold/15">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-ink-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="align-top">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2.5 py-2 text-ink-muted">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-gold/20 px-3 py-2.5">
      <p className="text-[0.62rem] text-gold">{label}</p>
      <p className="tnum mt-1 text-[0.95rem] text-forest">{value}</p>
      {hint ? <p className="mt-0.5 text-[0.62rem] leading-5 text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export default async function MarketingReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<{ preset?: string; from?: string; to?: string; group?: string }>;
}) {
  await connection();
  await requireAdmin();

  const { report: reportSlug } = await params;
  if (!isMarketingReport(reportSlug)) notFound();
  const meta = marketingReport(reportSlug);

  const query = await searchParams;
  const range = parseRange(query);
  const overview = await getOverview(range);
  const generatedAt = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const comparisonKpis = [
    overview.financial.find((kpi) => kpi.key === "gross_revenue"),
    overview.financial.find((kpi) => kpi.key === "ad_spend"),
    overview.conversion.find((kpi) => kpi.key === "orders_created"),
    overview.financial.find((kpi) => kpi.key === "roas"),
  ].filter((kpi): kpi is Kpi => Boolean(kpi));

  let body: ReactNode;

  if (reportSlug === "overview") {
    body = (
      <>
        <AdminCard title="المؤشرات المالية" description="الفترة الحالية مقابل الفترة السابقة.">
          <KpiGrid items={overview.financial} compact />
        </AdminCard>
        <AdminCard title="مؤشرات التحويل" description="الفترة الحالية مقابل الفترة السابقة.">
          <KpiGrid items={overview.conversion} compact />
        </AdminCard>
        <AdminCard title="الإيراد مقابل الإنفاق الإعلاني">
          <RevenueSpendChart
            points={overview.series.points}
            hasSpend={overview.series.hasSpend}
          />
        </AdminCard>
        <AdminCard title="مسار التحويل">
          <FunnelBars stages={overview.funnel} />
        </AdminCard>
      </>
    );
  } else if (reportSlug === "campaigns") {
    const campaigns = await getCampaignPerformance(range);
    const sorted = [...campaigns].sort((a, b) => b.websiteRevenue - a.websiteRevenue);
    const totals = {
      spend: campaigns.reduce((sum, campaign) => sum + (campaign.spend ?? 0), 0),
      hasSpend: campaigns.some((campaign) => campaign.spend !== null),
      revenue: campaigns.reduce((sum, campaign) => sum + campaign.websiteRevenue, 0),
      orders: campaigns.reduce((sum, campaign) => sum + campaign.websiteOrders, 0),
    };
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat
            label="المصاريف المسجلة"
            value={totals.hasSpend ? formatPrice(totals.spend) : "غير مسجلة"}
          />
          <ReportStat label="إيراد الموقع المنسوب" value={formatPrice(totals.revenue)} />
          <ReportStat label="طلبات الموقع المنسوبة" value={formatNumber(totals.orders, "en")} />
          <ReportStat label="الحملات" value={formatNumber(campaigns.length, "en")} />
        </div>
        <AdminCard title="أعلى الحملات بالإيراد المنسوب">
          <HorizontalBarList
            items={sorted.slice(0, 8).map((campaign) => ({
              label: campaign.name,
              value: campaign.websiteRevenue,
              hint: `${campaign.websiteOrders} طلب موقع · ${campaign.cancelledOrders} ملغي`,
            }))}
            emptyLabel="لا توجد حملات مسجلة."
          />
        </AdminCard>
        <AdminCard title="تفاصيل الحملات" bodyClassName="p-0">
          <ReportTable
            headers={[
              "الحملة",
              "المنصة",
              "الحالة",
              "المشتري",
              "المصاريف",
              "الظهور",
              "النقرات",
              "CTR %",
              "CPC",
              "مشتريات المنصة",
              "طلبات الموقع",
              "المؤكدة",
              "المُسلّمة",
              "الملغاة",
              "الإيراد",
              "ROAS",
              "CPA",
            ]}
            rows={sorted.map((campaign) => [
              campaign.name,
              PLATFORM_LABELS[campaign.platform],
              CAMPAIGN_STATUS_LABELS[campaign.status],
              campaign.media_buyer_name ?? "بدون إسناد",
              campaign.spend === null ? "غير مسجل" : formatPrice(campaign.spend),
              campaign.impressions ?? "—",
              campaign.clicks ?? "—",
              formatMetric(campaign.ctr, "percent"),
              formatMetric(campaign.cpc, "currency"),
              campaign.platformPurchases ?? "—",
              campaign.websiteOrders,
              campaign.confirmedOrders,
              campaign.deliveredOrders,
              campaign.cancelledOrders,
              formatPrice(campaign.websiteRevenue),
              formatMetric(campaign.roas, "ratio"),
              formatMetric(campaign.cpa, "currency"),
            ])}
            empty="لا توجد حملات مسجلة."
            minWidth={1100}
          />
        </AdminCard>
      </>
    );
  } else if (reportSlug === "media-buyers") {
    const buyers = await getMediaBuyerPerformance(range);
    const sorted = [...buyers].sort((a, b) => b.revenue - a.revenue);
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat label="المشترون" value={formatNumber(buyers.length, "en")} />
          <ReportStat
            label="النشطون"
            value={formatNumber(buyers.filter((buyer) => buyer.active).length, "en")}
          />
          <ReportStat
            label="إيراد الموقع المنسوب"
            value={formatPrice(buyers.reduce((sum, buyer) => sum + buyer.revenue, 0))}
          />
          <ReportStat
            label="طلبات الموقع"
            value={formatNumber(
              buyers.reduce((sum, buyer) => sum + buyer.purchases, 0),
              "en",
            )}
          />
        </div>
        <AdminCard title="أعلى المشترين بالإيراد المنسوب">
          <HorizontalBarList
            items={sorted.slice(0, 8).map((buyer) => ({
              label: buyer.full_name,
              value: buyer.revenue,
              hint: `${buyer.purchases} طلب · ${buyer.campaignCount} حملة`,
            }))}
            emptyLabel="لا يوجد مشترون إعلاميون."
          />
        </AdminCard>
        <AdminCard title="تقييم المشترين الإعلاميين" bodyClassName="p-0">
          <ReportTable
            headers={[
              "المشتري",
              "الحملات",
              "المصاريف",
              "الإيراد",
              "ROAS",
              "CPA",
              "المشتريات",
              "مؤكدة",
              "مُسلّمة",
              "ملغاة",
              "معدل الإلغاء %",
              "AOV",
              "استهلاك الميزانية %",
              "الربح الإجمالي",
            ]}
            rows={sorted.map((buyer) => [
              buyer.full_name,
              buyer.campaignCount,
              buyer.spend === null ? "غير مسجل" : formatPrice(buyer.spend),
              formatPrice(buyer.revenue),
              formatMetric(buyer.roas, "ratio"),
              formatMetric(buyer.cpa, "currency"),
              buyer.purchases,
              buyer.confirmedOrders,
              buyer.deliveredOrders,
              buyer.cancelledOrders,
              formatMetric(buyer.cancellationRate, "percent"),
              formatMetric(buyer.averageOrderValue, "currency"),
              formatMetric(buyer.budgetUtilization, "percent"),
              buyer.grossProfit === null ? "التكاليف ناقصة" : formatPrice(buyer.grossProfit),
            ])}
            empty="لا يوجد مشترون إعلاميون."
            minWidth={1050}
          />
        </AdminCard>
      </>
    );
  } else if (reportSlug === "products") {
    const products = await getProductPerformance(range);
    const sorted = [...products].sort((a, b) => b.revenue - a.revenue);
    const variantRows = sorted
      .flatMap((product) =>
        product.variants.map((variant) => ({
          ...variant,
          productId: product.id,
          productName: product.name,
        })),
      )
      .sort((a, b) => b.revenue - a.revenue);
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat label="المنتجات" value={formatNumber(products.length, "en")} />
          <ReportStat
            label="الطلبات"
            value={formatNumber(products.reduce((sum, product) => sum + product.orders, 0), "en")}
          />
          <ReportStat
            label="الوحدات"
            value={formatNumber(products.reduce((sum, product) => sum + product.units, 0), "en")}
          />
          <ReportStat
            label="الإيراد"
            value={formatPrice(products.reduce((sum, product) => sum + product.revenue, 0))}
          />
        </div>
        <AdminCard title="أعلى المنتجات بالإيراد">
          <HorizontalBarList
            items={sorted.slice(0, 8).map((product) => ({
              label: product.name,
              value: product.revenue,
              hint: `${product.orders} طلب · ${product.units} وحدة`,
            }))}
            emptyLabel="لا توجد بيانات منتجات."
          />
        </AdminCard>
        <AdminCard title="أداء المنتجات" bodyClassName="p-0">
          <ReportTable
            headers={[
              "المنتج",
              "الطلبات",
              "الملغاة",
              "معدل الإلغاء %",
              "الوحدات",
              "الإيراد",
              "إيراد التوصيل",
              "المصاريف",
              "ROAS",
              "مشاهدات المنتج",
              "معدل التحويل %",
              "الأحجام",
            ]}
            rows={sorted.map((product) => [
              product.name,
              product.orders,
              product.cancelledOrders,
              formatMetric(product.cancellationRate, "percent"),
              product.units,
              formatPrice(product.revenue),
              formatPrice(product.deliveredRevenue),
              product.spend === null ? "غير متاح" : formatPrice(product.spend),
              formatMetric(product.roas, "ratio"),
              product.views === null ? "غير متاح" : product.views,
              formatMetric(product.conversionRate, "percent"),
              product.variants.length === 0
                ? "—"
                : product.variants
                    .map((variant) => `${variant.name}: ${variant.units}`)
                    .join(" · "),
            ])}
            empty="لا توجد بيانات منتجات."
            minWidth={1050}
          />
        </AdminCard>
        <AdminCard title="أداء الأحجام" bodyClassName="p-0">
          <ReportTable
            headers={["الحجم", "المنتج", "الطلبات", "الوحدات", "الإيراد", "إيراد التوصيل"]}
            rows={variantRows.map((variant) => [
              variant.name,
              variant.productName,
              variant.orders,
              variant.units,
              formatPrice(variant.revenue),
              formatPrice(variant.deliveredRevenue),
            ])}
            empty="لا توجد بيانات أحجام."
            minWidth={720}
          />
        </AdminCard>
      </>
    );
  } else if (reportSlug === "geography") {
    const rows = await getGeography(range);
    const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat label="المحافظات" value={formatNumber(rows.length, "en")} />
          <ReportStat
            label="الطلبات"
            value={formatNumber(rows.reduce((sum, row) => sum + row.orders, 0), "en")}
          />
          <ReportStat
            label="الإيراد غير الملغي"
            value={formatPrice(rows.reduce((sum, row) => sum + row.revenue, 0))}
          />
          <ReportStat
            label="إيراد التوصيل"
            value={formatPrice(rows.reduce((sum, row) => sum + row.deliveredRevenue, 0))}
          />
        </div>
        <AdminCard title="أعلى المحافظات بالإيراد">
          <HorizontalBarList
            items={sorted.slice(0, 10).map((row) => ({
              label: row.governorate,
              value: row.revenue,
              hint: `${row.orders} طلب · ${row.deliveredOrders} مُسلّم`,
            }))}
            emptyLabel="لا توجد بيانات محافظات."
          />
        </AdminCard>
        <AdminCard title="التوزيع الجغرافي" bodyClassName="p-0">
          <ReportTable
            headers={[
              "المحافظة",
              "الطلبات",
              "غير الملغاة",
              "الإيراد",
              "المُسلّمة",
              "إيراد التوصيل",
              "الملغاة",
              "قيمة الملغاة",
              "AOV",
            ]}
            rows={sorted.map((row) => [
              row.governorate,
              row.orders,
              row.validOrders,
              formatPrice(row.revenue),
              row.deliveredOrders,
              formatPrice(row.deliveredRevenue),
              row.cancelledOrders,
              formatPrice(row.cancelledRevenue),
              row.averageOrderValue === null ? "—" : formatPrice(row.averageOrderValue),
            ])}
            empty="لا توجد بيانات محافظات."
            minWidth={850}
          />
        </AdminCard>
      </>
    );
  } else if (reportSlug === "cod") {
    const cod = await getCodAnalytics(range);
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat label="إجمالي الطلبات" value={formatNumber(cod.totalOrders, "en")} />
          <ReportStat label="الإيراد غير الملغي" value={formatPrice(cod.grossRevenue)} />
          <ReportStat label="إيراد المُسلّمة" value={formatPrice(cod.deliveredRevenue)} />
          <ReportStat label="قيمة الملغاة" value={formatPrice(cod.cancelledRevenue)} />
        </div>
        <AdminCard title="توزيع الطلبات على الحالات">
          <HorizontalBarList
            items={[
              { label: "بانتظار التأكيد", value: cod.pendingOrders },
              { label: "تم التأكيد", value: cod.confirmedOrders },
              { label: "قيد التجهيز", value: cod.processingOrders },
              { label: "في الطريق", value: cod.shippedOrders },
              { label: "تم التوصيل", value: cod.deliveredOrders },
              { label: "ملغي", value: cod.cancelledOrders },
            ]}
            format="number"
            emptyLabel="لا توجد طلبات."
          />
        </AdminCard>
        <AdminCard title="حالات الطلبات" bodyClassName="p-0">
          <ReportTable
            headers={["الحالة", "عدد الطلبات", "القيمة", "ملاحظة"]}
            rows={[
              ["بانتظار التأكيد", cod.pendingOrders, formatPrice(cod.pendingRevenue), "ليست إيرادًا محققًا"],
              ["تم التأكيد", cod.confirmedOrders, "—", "ضمن الإيراد غير الملغي"],
              ["قيد التجهيز", cod.processingOrders, "—", "ضمن الإيراد غير الملغي"],
              ["في الطريق", cod.shippedOrders, "—", "ليست إيرادًا مُسلّمًا"],
              ["تم التوصيل", cod.deliveredOrders, formatPrice(cod.deliveredRevenue), "الإيراد المحقق"],
              ["ملغي", cod.cancelledOrders, formatPrice(cod.cancelledRevenue), "مستبعد من الإيراد"],
            ]}
            empty="لا توجد طلبات."
            minWidth={560}
          />
        </AdminCard>
        <AdminCard title="مؤشرات الجودة" bodyClassName="p-0">
          <ReportTable
            headers={["المؤشر", "القيمة", "ملاحظة"]}
            rows={[
              ["معدل نجاح التوصيل", formatMetric(cod.deliverySuccessRate, "percent"), "المُسلّمة ÷ (المُسلّمة + الملغاة)"],
              ["معدل الإلغاء", formatMetric(cod.cancellationRate, "percent"), "الملغاة ÷ كل الطلبات"],
              ["متوسط قيمة الطلب", formatMetric(cod.averageOrderValue, "currency"), "الإيراد غير الملغي ÷ الطلبات غير الملغاة"],
              [
                "فتح رابط واتساب (طلب فريد)",
                cod.whatsappOpenedOrders === null
                  ? "غير متاح"
                  : formatNumber(cod.whatsappOpenedOrders, "en"),
                "محاولة فتح الرابط فقط — لا تعني إرسال رسالة",
              ],
              ["عملاء غير قابلين للوصول", "غير متتبع", "لا توجد حالة مخصصة في نموذج الطلب"],
            ]}
            empty="لا توجد بيانات."
            minWidth={560}
          />
        </AdminCard>
      </>
    );
  } else if (reportSlug === "attribution") {
    const attribution = await getAttribution(range);
    const attributionRows = (rows: typeof attribution.last) =>
      rows.map((row) => [
        row.source || "مباشر",
        row.medium || "—",
        row.campaign || "بدون حملة",
        row.orders,
        row.validOrders,
        formatPrice(row.revenue),
        formatPrice(row.deliveredRevenue),
        row.cancelledOrders,
      ]);
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat label="إجمالي الطلبات" value={formatNumber(attribution.totalOrders, "en")} />
          <ReportStat label="طلبات لها سجل تتبع" value={formatNumber(attribution.attributedOrders, "en")} />
          <ReportStat label="بلا سجل تتبع" value={formatNumber(attribution.unattributedOrders, "en")} />
          <ReportStat
            label="UTM بلا حملة مسجلة"
            value={formatNumber(attribution.unmatchedCampaignOrders, "en")}
          />
        </div>
        <AdminCard title="أعلى المصادر بالإيراد (اللمسة الأخيرة)">
          <HorizontalBarList
            items={[...attribution.last]
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 8)
              .map((row) => ({
                label: `${row.source || "مباشر"} / ${row.medium || "—"}`,
                value: row.revenue,
                hint: `${row.orders} طلب · ${row.campaign || "بدون حملة"}`,
              }))}
            emptyLabel="لا توجد بيانات إسناد."
          />
        </AdminCard>
        <AdminCard title="اللمسة الأخيرة" bodyClassName="p-0">
          <ReportTable
            headers={["المصدر", "الوسيط", "الحملة", "الطلبات", "غير الملغاة", "الإيراد", "إيراد التوصيل", "الملغاة"]}
            rows={attributionRows(attribution.last)}
            empty="لا توجد بيانات لمسة أخيرة."
            minWidth={720}
          />
        </AdminCard>
        <AdminCard title="اللمسة الأولى" bodyClassName="p-0">
          <ReportTable
            headers={["المصدر", "الوسيط", "الحملة", "الطلبات", "غير الملغاة", "الإيراد", "إيراد التوصيل", "الملغاة"]}
            rows={attributionRows(attribution.first)}
            empty="لا توجد بيانات لمسة أولى."
            minWidth={720}
          />
        </AdminCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard title="المصادر الخارجية" bodyClassName="p-0">
            <ReportTable
              headers={["المصدر", "الطلبات", "الإيراد"]}
              rows={attribution.referrers.map((row) => [
                row.referrer || "مباشر / بلا إحالة",
                row.orders,
                formatPrice(row.revenue),
              ])}
              empty="لا توجد إحالات."
              minWidth={400}
            />
          </AdminCard>
          <AdminCard title="صفحات الهبوط" bodyClassName="p-0">
            <ReportTable
              headers={["الصفحة", "الطلبات", "الإيراد"]}
              rows={attribution.landingPages.map((row) => [
                row.landingPage || "غير مسجلة",
                row.orders,
                formatPrice(row.revenue),
              ])}
              empty="لا توجد صفحات هبوط."
              minWidth={400}
            />
          </AdminCard>
        </div>
      </>
    );
  } else if (reportSlug === "customers") {
    const requested = query.group;
    const grouping =
      requested === "day" || requested === "week" || requested === "month"
        ? requested
        : range.days <= 45
          ? "day"
          : range.days <= 180
            ? "week"
            : "month";
    const customers = await getCustomerAnalytics(range, grouping);
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat label="عملاء جدد" value={formatNumber(customers.newCustomers, "en")} />
          <ReportStat label="عملاء عائدون" value={formatNumber(customers.returningCustomers, "en")} />
          <ReportStat label="CAC" value={formatMetric(customers.cac, "currency")} />
          <ReportStat
            label="LTV"
            value={formatMetric(customers.ltv, "currency")}
            hint={customers.ltvNote}
          />
        </div>
        <AdminCard title="العملاء الجدد والعائدون">
          <CustomerTrendChart points={customers.trend} />
        </AdminCard>
        <AdminCard title="تفاصيل الفترات" bodyClassName="p-0">
          <ReportTable
            headers={["الفترة", "عملاء جدد", "عملاء عائدون", "الطلبات", "الإيراد"]}
            rows={customers.trend.map((point) => [
              point.label,
              point.newCustomers,
              point.returningCustomers,
              point.orders,
              formatPrice(point.revenue),
            ])}
            empty="لا توجد بيانات."
            minWidth={500}
          />
        </AdminCard>
      </>
    );
  } else {
    const series = overview.series;
    body = (
      <>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStat
            label="الطلبات"
            value={formatNumber(
              series.points.reduce((sum, point) => sum + point.orders, 0),
              "en",
            )}
          />
          <ReportStat
            label="الإيراد"
            value={formatPrice(series.points.reduce((sum, point) => sum + point.revenue, 0))}
          />
          <ReportStat
            label="الإيراد المُسلّم"
            value={formatPrice(
              series.points.reduce((sum, point) => sum + point.deliveredRevenue, 0),
            )}
          />
          <ReportStat
            label="المصاريف الإعلانية"
            value={
              series.hasSpend
                ? formatPrice(
                    series.points.reduce((sum, point) => sum + (point.spend ?? 0), 0),
                  )
                : "غير مسجلة"
            }
          />
        </div>
        <AdminCard title="الإيراد مقابل الإنفاق">
          <RevenueSpendChart points={series.points} hasSpend={series.hasSpend} />
        </AdminCard>
        <AdminCard title="تفاصيل الفترات" bodyClassName="p-0">
          <ReportTable
            headers={["الفترة", "الطلبات", "الإيراد", "الإيراد المُسلّم", "المصاريف الإعلانية"]}
            rows={series.points.map((point) => [
              point.label,
              point.orders,
              formatPrice(point.revenue),
              formatPrice(point.deliveredRevenue),
              point.spend === null ? "غير مسجل" : formatPrice(point.spend),
            ])}
            empty="لا توجد بيانات."
            minWidth={560}
          />
        </AdminCard>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 bg-ivory p-5 print:max-w-none print:bg-white print:p-0">
      <header className="border-b-2 border-forest/20 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] tracking-[0.24em] text-gold">ALSULIMAN OLIVE OIL</p>
            <h1 className="mt-1 text-[1.55rem] text-forest">{meta.title}</h1>
            <p className="mt-1 max-w-3xl text-[0.78rem] leading-6 text-ink-muted">
              {meta.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton />
            <Link
              href={rangeHref("/admin/marketing/export", range, { type: reportSlug })}
              className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
            >
              ⬇ CSV
            </Link>
            <Link
              href={rangeHref("/admin/marketing/reports", range)}
              className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
            >
              كل التقارير
            </Link>
          </div>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-[0.7rem] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-gold">فترة التقرير</dt>
            <dd className="mt-0.5 text-forest">{range.labelAr}</dd>
          </div>
          <div>
            <dt className="text-gold">فترة المقارنة</dt>
            <dd className="mt-0.5 text-forest">{range.prevLabelAr}</dd>
          </div>
          <div>
            <dt className="text-gold">تاريخ الإنشاء</dt>
            <dd className="mt-0.5 text-forest">{generatedAt}</dd>
          </div>
          <div>
            <dt className="text-gold">العملة</dt>
            <dd className="mt-0.5 text-forest">جنيه مصري (EGP)</dd>
          </div>
        </dl>
      </header>

      {reportSlug !== "overview" ? (
        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {comparisonKpis.map((kpi) => {
            const tone = changeTone(kpi.changePct, kpi.goodDirection);
            return (
              <div key={kpi.key} className="border border-gold/20 px-3 py-2.5">
                <p className="text-[0.62rem] text-gold">{kpi.label}</p>
                <p className="tnum mt-1 text-[0.98rem] text-forest">
                  {formatMetric(kpi.value, kpi.format)}
                </p>
                <p className="mt-0.5 text-[0.62rem] leading-5 text-ink-muted">
                  سابقًا: {formatMetric(kpi.previous, kpi.format)} ·{" "}
                  <span
                    className={
                      tone === "good"
                        ? "text-forest"
                        : tone === "bad"
                          ? "text-red-800"
                          : "text-ink-muted"
                    }
                  >
                    {formatChange(kpi.changePct)}
                  </span>
                </p>
              </div>
            );
          })}
        </section>
      ) : null}

      {body}

      <footer className="border-t border-gold/20 pt-3 text-[0.66rem] leading-6 text-ink-muted">
        <p>
          المصدر: طلبات الموقع المسجلة، وأحداث التتبع الداخلية، وسجلات المصاريف الإعلانية
          المُدخلة. لا تتضمن التقارير أسماء العملاء أو هواتفهم أو عناوينهم أو ملاحظاتهم.
        </p>
        <p>
          «غير متاح» تعني أن مصدر البيانات غير موجود، وليست صفرًا. الإيراد المُسلّم يشمل
          الطلبات بحالة «تم التوصيل» فقط، ولا يشمل أي طلب ملغى أو معلّق.
        </p>
      </footer>
    </div>
  );
}
