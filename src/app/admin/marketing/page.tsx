import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getCampaignPerformance, getOverview } from "@/lib/marketing";
import { formatMetric } from "@/lib/marketing-format";
import { formatPrice } from "@/lib/format";
import { AdminCard, EmptyState, Table, Td, Th } from "@/components/admin/ui";
import { KpiGrid } from "@/components/admin/marketing/KpiCard";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { FunnelBars, RevenueSpendChart } from "@/components/admin/marketing/Charts";
import { CampaignStatusBadge } from "@/components/admin/marketing/Badges";

export const instant = false;

export const metadata = { title: "تحليلات التسويق · Admin" };

export default async function MarketingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const [overview, campaigns] = await Promise.all([
    getOverview(range),
    getCampaignPerformance(range),
  ]);

  const topCampaigns = [...campaigns]
    .sort((a, b) => b.websiteRevenue - a.websiteRevenue)
    .slice(0, 5);

  const readiness = [
    {
      label: "تتبع الموقع",
      state: overview.current.tracking.available
        ? `${overview.current.tracking.events.toLocaleString("en-US")} حدثًا مسجلًا`
        : "لم تُسجل أحداث بعد",
      ok: overview.current.tracking.available,
      hint: "PageView وViewContent وAddToCart وInitiateCheckout وPurchase.",
      href: "/admin/marketing/attribution",
      action: "تفاصيل الإسناد",
    },
    {
      label: "المصاريف الإعلانية",
      state: overview.current.spend.available
        ? `${overview.current.spend.entries} سجلًا — ${formatPrice(overview.current.spend.spend ?? 0)}`
        : "لا توجد مصاريف مسجلة",
      ok: overview.current.spend.available,
      hint: "أدخل المصاريف يدويًا أو استوردها لاحقًا من Meta/Google.",
      href: "/admin/marketing/data",
      action: "إدخال مصاريف",
    },
    {
      label: "تكلفة المنتجات",
      state:
        overview.current.costs.lines > 0 && overview.current.costs.missingCostLines === 0
          ? "التكاليف مكتملة للطلبات المُسلّمة"
          : overview.current.costs.missingCostLines > 0
            ? `${overview.current.costs.missingCostLines} سطرًا بلا تكلفة`
            : "لا توجد طلبات مُسلّمة بعد",
      ok: overview.current.costs.lines > 0 && overview.current.costs.missingCostLines === 0,
      hint: "بدون تكلفة الوحدة يظهر الربح الإجمالي كغير متاح — لا يُقدَّر تخمينًا.",
      href: "/admin/products",
      action: "إدارة المنتجات",
    },
    {
      label: "ربط الحملات",
      state:
        campaigns.length > 0
          ? `${campaigns.length} حملة مسجلة`
          : "لا توجد حملات مسجلة",
      ok: campaigns.length > 0,
      hint: "اربط كل حملة بقيمة utm_campaign وبمشترٍ إعلامي لتقييم الأداء.",
      href: "/admin/marketing/data",
      action: "إضافة حملة",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">تحليلات التسويق</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            أداء التسويق من الطلبات المسجلة والتتبع الفعلي فقط. لا تُعرض مصاريف أو تحويلات
            تقديرية، وكل مؤشر يوضح فترته السابقة أو سبب عدم إتاحته.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "overview" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href={rangeHref("/admin/marketing/reports/marketing", range)}
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory transition-colors hover:bg-forest-deep"
          >
            تقرير قابل للطباعة
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing" />

      {!overview.current.tracking.available || !overview.current.spend.available ? (
        <div className="border border-gold/40 bg-gold/10 px-4 py-3 text-[0.76rem] leading-6 text-forest">
          <strong>ملاحظة بيانات:</strong>{" "}
          {!overview.current.tracking.available
            ? "لا توجد أحداث تتبع في هذه الفترة، لذلك مؤشرات الزوار والسلة والتحويل تظهر «غير متاح» بدل الصفر. "
            : ""}
          {!overview.current.spend.available
            ? "لم تُسجَّل مصاريف إعلانية، لذلك ROAS وCPA وصافي الإيراد تظهر «غير متاح» حتى تُدخل المصاريف. "
            : ""}
          <Link href="/admin/marketing/data" className="underline decoration-gold underline-offset-4">
            إدخال البيانات الآن
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[1.05rem] text-forest">المؤشرات المالية</h2>
          <p className="text-[0.68rem] text-ink-muted">
            {range.labelAr} · المقارنة مع {range.prevLabelAr}
          </p>
        </div>
        <KpiGrid items={overview.financial} />
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.05rem] text-forest">مؤشرات التحويل</h2>
        <KpiGrid items={overview.conversion} />
      </section>

      <AdminCard
        title="الإيراد مقابل الإنفاق الإعلاني"
        description="الإيراد من الطلبات غير الملغاة، والإنفاق من السجلات اليدوية أو المستوردة."
        action={
          <Link
            href={rangeHref("/admin/marketing/reports/sales", range)}
            className="text-[0.74rem] text-ink-muted hover:text-forest"
          >
            تقرير المبيعات ←
          </Link>
        }
      >
        <RevenueSpendChart points={overview.series.points} hasSpend={overview.series.hasSpend} />
      </AdminCard>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <AdminCard
          title="مسار التحويل"
          description="المراحل الأربع الأولى بالجلسات، والثلاث الأخيرة بالطلبات."
          action={
            <Link
              href={rangeHref("/admin/marketing/funnel", range)}
              className="text-[0.74rem] text-ink-muted hover:text-forest"
            >
              التفاصيل ←
            </Link>
          }
        >
          <FunnelBars stages={overview.funnel} />
        </AdminCard>

        <AdminCard title="جاهزية البيانات" description="ما الذي يجعل كل مؤشر متاحًا أو غير متاح.">
          <ul className="divide-y divide-gold/12">
            {readiness.map((item) => (
              <li key={item.label} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[0.82rem] text-forest">
                    <span
                      className={
                        item.ok
                          ? "inline-block size-2 rounded-full bg-forest"
                          : "inline-block size-2 rounded-full bg-gold"
                      }
                    />
                    {item.label}
                  </p>
                  <p className="mt-1 text-[0.72rem] text-ink-muted">{item.state}</p>
                  <p className="mt-0.5 text-[0.68rem] leading-5 text-ink-muted">{item.hint}</p>
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 text-[0.7rem] text-ink-muted underline decoration-gold/40 underline-offset-4 hover:text-forest"
                >
                  {item.action}
                </Link>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <AdminCard
        title="أفضل الحملات بالإيراد"
        description="الإيراد المنسوب فعليًا عبر utm_campaign — وليس مشتريات المنصة المعلنة."
        action={
          <Link
            href={rangeHref("/admin/marketing/campaigns", range)}
            className="text-[0.74rem] text-ink-muted hover:text-forest"
          >
            كل الحملات ←
          </Link>
        }
        bodyClassName="p-0"
      >
        {topCampaigns.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="لا توجد حملات بعد"
              body="أضف حملة بقيمة utm_campaign ثم اربطها بمشترٍ إعلامي لتظهر هنا."
            />
          </div>
        ) : (
          <Table className="border-0">
            <thead>
              <tr>
                <Th>الحملة</Th>
                <Th>الحالة</Th>
                <Th>المصاريف</Th>
                <Th>الإيراد</Th>
                <Th>ROAS</Th>
                <Th>CPA</Th>
                <Th>طلبات الموقع</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/12 bg-ivory">
              {topCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-cream/30">
                  <Td>
                    <p className="text-forest">{campaign.name}</p>
                    <p className="text-[0.68rem] text-ink-muted">
                      {campaign.media_buyer_name ?? "بدون مشترٍ إعلامي"}
                    </p>
                  </Td>
                  <Td>
                    <CampaignStatusBadge status={campaign.status} />
                  </Td>
                  <Td className="tnum">
                    {campaign.spend === null ? "غير مسجل" : formatPrice(campaign.spend)}
                  </Td>
                  <Td className="tnum text-forest">{formatPrice(campaign.websiteRevenue)}</Td>
                  <Td className="tnum">{formatMetric(campaign.roas, "ratio")}</Td>
                  <Td className="tnum">{formatMetric(campaign.cpa, "currency")}</Td>
                  <Td className="tnum">{campaign.websiteOrders}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AdminCard>
    </div>
  );
}
