import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getMediaBuyerPerformance } from "@/lib/marketing";
import { PLATFORM_LABELS } from "@/lib/marketing-types";
import { shortDate } from "@/lib/marketing-format";
import { formatPrice } from "@/lib/format";
import { AdminCard, EmptyState, MiniButton, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { BuyerSparkline } from "@/components/admin/marketing/Charts";
import { MediaBuyerForm } from "@/components/admin/marketing/MediaBuyerForm";
import { setMediaBuyerActiveFormAction } from "@/app/actions/marketing";

export const instant = false;

export const metadata = { title: "المشترون الإعلاميون · Admin" };

const money = (value: number | null) => (value === null ? "غير متاح" : formatPrice(value));
const percent = (value: number | null) => (value === null ? "غير متاح" : `${value.toFixed(1)}%`);
const ratio = (value: number | null) => (value === null ? "غير متاح" : `${value.toFixed(2)}×`);

export default async function MediaBuyersPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    edit?: string;
  }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const buyers = await getMediaBuyerPerformance(range);
  const editing = params.edit ? buyers.find((buyer) => buyer.id === params.edit) : undefined;

  const sorted = [...buyers].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return b.revenue - a.revenue;
  });

  const totals = {
    active: buyers.filter((buyer) => buyer.active).length,
    spend: buyers.reduce((sum, buyer) => sum + (buyer.spend ?? 0), 0),
    hasSpend: buyers.some((buyer) => buyer.spend !== null),
    revenue: buyers.reduce((sum, buyer) => sum + buyer.revenue, 0),
    orders: buyers.reduce((sum, buyer) => sum + buyer.purchases, 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">المشترون الإعلاميون</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            تقييم كل مشترٍ من الحملات المسندة إليه فقط. الإيراد والطلبات من إسناد الموقع،
            والمصاريف من السجلات اليدوية أو المستوردة، ولا تُخلط بمشتريات المنصة المعلنة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "media-buyers" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href="#buyer-form"
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory transition-colors hover:bg-forest-deep"
          >
            + مشترٍ إعلامي
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/media-buyers" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">المشترون النشطون</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {totals.active} من {buyers.length}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">المصاريف المسندة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {totals.hasSpend ? formatPrice(totals.spend) : "غير مسجلة"}
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
        title={`${buyers.length} مشترٍ إعلامي`}
        description="المؤشرات تُحسب من الحملات المسندة داخل الفترة المحددة."
        bodyClassName="p-0"
      >
        {sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="لا يوجد مشترون إعلاميون بعد"
              body="أضف ملف المشتري الإعلامي أولًا، ثم أسند الحملات إليه من صفحة إدخال البيانات."
            />
          </div>
        ) : (
          <Table className="border-0">
            <thead>
              <tr>
                <Th>المشتري</Th>
                <Th>الحملات</Th>
                <Th>المصاريف</Th>
                <Th>الإيراد</Th>
                <Th>ROAS</Th>
                <Th>CPA</Th>
                <Th>CPC</Th>
                <Th>المشتريات</Th>
                <Th>مؤكدة / مُسلّمة</Th>
                <Th>ملغاة</Th>
                <Th>معدل الإلغاء</Th>
                <Th>AOV</Th>
                <Th>استهلاك الميزانية</Th>
                <Th>الربح الإجمالي</Th>
                <Th>الاتجاه</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/12 bg-ivory">
              {sorted.map((buyer) => (
                <tr key={buyer.id} className="align-top hover:bg-cream/30">
                  <Td className="min-w-52">
                    <p className="flex flex-wrap items-center gap-2 text-forest">
                      {buyer.full_name}
                      {buyer.active ? (
                        <span className="rounded-full border border-forest/30 bg-sage/20 px-2 py-0.5 text-[0.6rem] text-forest">
                          نشط
                        </span>
                      ) : (
                        <span className="rounded-full border border-charcoal/20 bg-cream px-2 py-0.5 text-[0.6rem] text-ink-muted">
                          غير نشط
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[0.66rem] text-ink-muted" dir="ltr">
                      {buyer.email ?? "—"}
                    </p>
                    <p className="mt-0.5 text-[0.66rem] text-ink-muted">
                      {buyer.platforms.length > 0
                        ? buyer.platforms.map((platform) => PLATFORM_LABELS[platform]).join(" · ")
                        : "لم تُحدد منصات"}
                      {buyer.start_date ? ` · بدأ ${shortDate(buyer.start_date)}` : ""}
                    </p>
                  </Td>
                  <Td className="tnum">
                    <p>{buyer.campaignCount}</p>
                    {buyer.campaigns.length > 0 ? (
                      <p className="mt-0.5 max-w-44 text-[0.64rem] leading-4 text-ink-muted">
                        {buyer.campaigns.map((campaign) => campaign.name).join(" · ")}
                      </p>
                    ) : null}
                  </Td>
                  <Td className="tnum">{money(buyer.spend)}</Td>
                  <Td className="tnum text-forest">{formatPrice(buyer.revenue)}</Td>
                  <Td className="tnum">{ratio(buyer.roas)}</Td>
                  <Td className="tnum">{money(buyer.cpa)}</Td>
                  <Td className="tnum">{money(buyer.cpc)}</Td>
                  <Td className="tnum">{buyer.purchases}</Td>
                  <Td className="tnum">
                    {buyer.confirmedOrders} / {buyer.deliveredOrders}
                  </Td>
                  <Td className="tnum">{buyer.cancelledOrders}</Td>
                  <Td className="tnum">{percent(buyer.cancellationRate)}</Td>
                  <Td className="tnum">{money(buyer.averageOrderValue)}</Td>
                  <Td className="tnum">{percent(buyer.budgetUtilization)}</Td>
                  <Td className="tnum">
                    {buyer.grossProfit === null ? "التكاليف ناقصة" : formatPrice(buyer.grossProfit)}
                  </Td>
                  <Td>
                    <BuyerSparkline points={buyer.trend} />
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1.5">
                      <Link
                        href={`/admin/marketing/media-buyers?preset=${range.preset}${
                          range.preset === "custom" ? `&from=${range.from}&to=${range.to}` : ""
                        }&edit=${buyer.id}#buyer-form`}
                        className="text-[0.7rem] text-forest underline decoration-gold/40 underline-offset-4"
                      >
                        تعديل
                      </Link>
                      <form action={setMediaBuyerActiveFormAction}>
                        <input type="hidden" name="id" value={buyer.id} />
                        <input type="hidden" name="active" value={buyer.active ? "false" : "true"} />
                        <MiniButton type="submit">{buyer.active ? "إيقاف" : "تفعيل"}</MiniButton>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AdminCard>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        CPA = المصاريف ÷ طلبات الموقع المنسوبة · ROAS = الإيراد المنسوب ÷ المصاريف ·
        استهلاك الميزانية = المصاريف ÷ (الميزانية الشهرية × عدد أيام الفترة ÷ 30.44).
        الربح الإجمالي يظهر فقط عندما تكون تكلفة كل الأصناف المُسلّمة مسجلة.
      </p>

      <div id="buyer-form" className="scroll-mt-6">
        <AdminCard
          title={editing ? `تعديل: ${editing.full_name}` : "إضافة مشترٍ إعلامي"}
          description={
            editing
              ? "تعديل بيانات الملف لا يغيّر الحملات المسندة إليه."
              : "أنشئ ملفًا لكل مشترٍ ثم أسند الحملات إليه من صفحة إدخال البيانات."
          }
          action={
            editing ? (
              <Link
                href={rangeHref("/admin/marketing/media-buyers", range)}
                className="text-[0.72rem] text-ink-muted hover:text-forest"
              >
                إلغاء التعديل ×
              </Link>
            ) : null
          }
        >
          <MediaBuyerForm buyer={editing} />
        </AdminCard>
      </div>
    </div>
  );
}
