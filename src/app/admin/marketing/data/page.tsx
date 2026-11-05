import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { listCampaignOptions, listMediaBuyers, listSpendEntries } from "@/lib/marketing-admin";
import { listProductsAdmin } from "@/lib/catalog";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  PLATFORM_LABELS,
} from "@/lib/marketing-types";
import { shortDate } from "@/lib/marketing-format";
import { formatPrice } from "@/lib/format";
import {
  AdminCard,
  ConfirmSubmit,
  EmptyState,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { CampaignForm } from "@/components/admin/marketing/CampaignForm";
import { MediaBuyerForm } from "@/components/admin/marketing/MediaBuyerForm";
import { SpendForm } from "@/components/admin/marketing/SpendForm";
import { SourceBadge } from "@/components/admin/marketing/Badges";
import { DeleteCampaignButton } from "@/components/admin/marketing/DeleteCampaignButton";
import {
  deleteAdSpendFormAction,
  setCampaignStatusFormAction,
} from "@/app/actions/marketing";

export const instant = false;

export const metadata = { title: "إدخال بيانات التسويق · Admin" };

export default async function MarketingDataPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    editCampaign?: string;
  }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const today = new Date().toISOString().slice(0, 10);

  const [buyers, campaigns, products, spendEntries] = await Promise.all([
    listMediaBuyers(),
    listCampaignOptions(),
    listProductsAdmin(),
    listSpendEntries(range),
  ]);

  const editingCampaign = params.editCampaign
    ? campaigns.find((campaign) => campaign.id === params.editCampaign)
    : undefined;
  const productOptions = products.map((product) => ({ id: product.id, name: product.nameAr }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">إدخال بيانات التسويق</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            المصدر الوحيد للبيانات التسويقية الآن هو الإدخال اليدوي الموثّق. لا يتم توليد
            مصاريف أو تحويلات تقديرية، وكل سجل يحمل مصدره بوضوح.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.72rem] print:hidden">
          <Link href="#campaign-form" className="underline decoration-gold/50 underline-offset-4">
            حملة
          </Link>
          <Link href="#buyer-form" className="underline decoration-gold/50 underline-offset-4">
            مشترٍ إعلامي
          </Link>
          <Link href="#spend-form" className="underline decoration-gold/50 underline-offset-4">
            مصاريف
          </Link>
          <Link href="#spend-log" className="underline decoration-gold/50 underline-offset-4">
            سجل المصاريف
          </Link>
          <Link href="#campaign-list" className="underline decoration-gold/50 underline-offset-4">
            الحملات
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/data" showComparison={false} />

      <div className="border border-gold/30 bg-gold/10 px-4 py-3 text-[0.75rem] leading-6 text-forest">
        <strong>قاعدة البيانات:</strong> تُقبل بيانات المصاريف يدويًا حاليًا. ربط Meta API أو
        Google Ads API غير مُفعّل، وأي بيانات تُدخل كمصدر API يجب أن تكون مستوردة فعليًا من
        تقرير المنصة — لا تُدخل أرقامًا تقديرية. السجل الفريد هو (الحملة + التاريخ + المصدر)،
        وإعادة الحفظ تُحدّث نفس السجل بدل تكراره.
      </div>

      <div id="campaign-form" className="scroll-mt-6 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <AdminCard
          title={editingCampaign ? `تعديل الحملة: ${editingCampaign.name}` : "إضافة حملة"}
          description="قيمة utm_campaign هي مفتاح ربط الطلبات بالحملة. استخدم نفس القيمة الموجودة في رابط الإعلان."
          action={
            editingCampaign ? (
              <Link
                href={rangeHref("/admin/marketing/data", range)}
                className="text-[0.72rem] text-ink-muted hover:text-forest"
              >
                إلغاء التعديل ×
              </Link>
            ) : null
          }
        >
          <CampaignForm
            campaign={editingCampaign}
            buyers={buyers}
            products={productOptions}
          />
        </AdminCard>

        <div id="buyer-form" className="scroll-mt-6">
          <AdminCard
            title="إضافة مشترٍ إعلامي"
            description="ملف مستقل يمكن إسناد حملات متعددة إليه ومقارنة أدائه."
          >
            <MediaBuyerForm />
          </AdminCard>
        </div>
      </div>

      <div id="spend-form" className="scroll-mt-6">
        <AdminCard
          title="تسجيل مصاريف إعلانية"
          description="سجل يومي لكل حملة ومصدر. الحقول الاختيارية تبقى فارغة إذا لم تكن في تقرير المنصة."
        >
          <SpendForm campaigns={campaigns} defaultDate={today} />
        </AdminCard>
      </div>

      <AdminCard
        title={`سجل المصاريف — ${spendEntries.length} سجلًا`}
        description={`من ${range.from} إلى ${range.to}. يظهر آخر 500 سجل فقط.`}
        action={
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "overview" })}
            className="text-[0.72rem] text-ink-muted hover:text-forest"
          >
            تصدير ملخص الفترة ←
          </Link>
        }
        bodyClassName="p-0"
      >
        <div id="spend-log" className="scroll-mt-6">
          {spendEntries.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="لا توجد مصاريف مسجلة في هذه الفترة"
                body="أضف سجلًا من النموذج أعلاه. بدون مصاريف تظهر ROAS وCPA وصافي الإيراد كغير متاحة."
              />
            </div>
          ) : (
            <Table className="border-0">
              <thead>
                <tr>
                  <Th>التاريخ</Th>
                  <Th>الحملة</Th>
                  <Th>المصدر</Th>
                  <Th>المصاريف</Th>
                  <Th>الظهور</Th>
                  <Th>النقرات</Th>
                  <Th>مشتريات المنصة</Th>
                  <Th>إيراد المنصة</Th>
                  <Th>ملاحظات</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/12 bg-ivory">
                {spendEntries.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-cream/30">
                    <Td className="whitespace-nowrap text-forest">
                      {shortDate(entry.date)}
                    </Td>
                    <Td className="min-w-44">
                      <p className="text-forest">{entry.campaign_name}</p>
                      <p className="text-[0.66rem] text-ink-muted">
                        {PLATFORM_LABELS[entry.platform]}
                      </p>
                    </Td>
                    <Td>
                      <SourceBadge source={entry.source} />
                    </Td>
                    <Td className="tnum">{formatPrice(entry.spend)}</Td>
                    <Td className="tnum">{entry.impressions ?? "—"}</Td>
                    <Td className="tnum">{entry.clicks ?? "—"}</Td>
                    <Td className="tnum">{entry.platform_purchases ?? "—"}</Td>
                    <Td className="tnum">
                      {entry.platform_revenue === null ? "—" : formatPrice(entry.platform_revenue)}
                    </Td>
                    <Td className="max-w-52 text-[0.7rem] leading-5">{entry.notes || "—"}</Td>
                    <Td>
                      <form action={deleteAdSpendFormAction}>
                        <input type="hidden" name="id" value={entry.id} />
                        <ConfirmSubmit
                          message="حذف سجل المصاريف نهائيًا؟ سيؤثر ذلك على كل مؤشرات الفترة."
                          className="text-[0.7rem] text-red-800 underline decoration-red-800/30 underline-offset-4 hover:decoration-red-800"
                        >
                          حذف
                        </ConfirmSubmit>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </AdminCard>

      <AdminCard
        title={`الحملات — ${campaigns.length}`}
        description="الحملات غير المستخدمة فقط يمكن حذفها. الحملات التي لها مصاريف أو طلبات تبقى محفوظة ويُغيّر وضعها إلى «منتهية»."
        bodyClassName="p-0"
      >
        <div id="campaign-list" className="scroll-mt-6">
          {campaigns.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="لا توجد حملات"
                body="أضف حملة أولًا، ثم اربطها بالمشترٍ الإعلامي وقيمة utm_campaign."
              />
            </div>
          ) : (
            <Table className="border-0">
              <thead>
                <tr>
                  <Th>الحملة</Th>
                  <Th>المنصة</Th>
                  <Th>utm_campaign</Th>
                  <Th>المشتري</Th>
                  <Th>المنتج</Th>
                  <Th>الحالة</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/12 bg-ivory">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="align-top hover:bg-cream/30">
                    <Td className="min-w-48">
                      <p className="text-forest">{campaign.name}</p>
                      <p className="mt-0.5 text-[0.66rem] leading-5 text-ink-muted" dir="ltr">
                        {campaign.landing_page || "بلا صفحة هبوط"}
                      </p>
                    </Td>
                    <Td>{PLATFORM_LABELS[campaign.platform]}</Td>
                    <Td className="text-[0.72rem]">
                      <span dir="ltr">{campaign.utm_campaign || "—"}</span>
                    </Td>
                    <Td>{campaign.media_buyer_name ?? "بدون إسناد"}</Td>
                    <Td>{campaign.product_name ?? "—"}</Td>
                    <Td>
                      <form action={setCampaignStatusFormAction} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="id" value={campaign.id} />
                        <select
                          name="status"
                          defaultValue={campaign.status}
                          className="h-8 border border-forest/20 bg-ivory px-2 text-[0.7rem] text-charcoal"
                        >
                          {CAMPAIGN_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {CAMPAIGN_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center rounded-xs border border-forest/20 px-2 text-[0.68rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
                        >
                          حفظ
                        </button>
                      </form>
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-2">
                        <Link
                          href={`/admin/marketing/data?preset=${range.preset}${
                            range.preset === "custom"
                              ? `&from=${range.from}&to=${range.to}`
                              : ""
                          }&editCampaign=${campaign.id}#campaign-form`}
                          className="text-[0.7rem] text-forest underline decoration-gold/40 underline-offset-4"
                        >
                          تعديل
                        </Link>
                        <DeleteCampaignButton id={campaign.id} name={campaign.name} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </AdminCard>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        لا تُدخل أرقامًا غير موجودة في تقرير المنصة. الحقول الفارغة تعني «غير معروف» وتُعرض
        كذلك في التقارير بدل الصفر. حذف سجل مصاريف أو تعديله يعيد حساب كل المؤشرات
        المرتبطة فورًا.
      </p>
    </div>
  );
}
