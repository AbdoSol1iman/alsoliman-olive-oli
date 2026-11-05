import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getAttribution } from "@/lib/marketing";
import { formatPrice } from "@/lib/format";
import type { AttributionRow } from "@/lib/marketing-types";
import { AdminCard, EmptyState, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";

export const instant = false;

export const metadata = { title: "الإسناد · Admin" };

const percent = (value: number | null) =>
  value === null ? "غير متاح" : `${value.toFixed(1)}%`;

function AttributionTable({ rows, empty }: { rows: AttributionRow[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title={empty} body="ستظهر البيانات بعد تسجيل طلبات تحمل بيانات إسناد." />
      </div>
    );
  }
  return (
    <Table className="border-0">
      <thead>
        <tr>
          <Th>المصدر</Th>
          <Th>الوسيط</Th>
          <Th>الحملة</Th>
          <Th>الطلبات</Th>
          <Th>غير الملغاة</Th>
          <Th>الإيراد</Th>
          <Th>إيراد التوصيل</Th>
          <Th>الملغاة</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gold/12 bg-ivory">
        {rows.map((row, index) => (
          <tr key={`${row.source}-${row.medium}-${row.campaign}-${index}`} className="hover:bg-cream/30">
            <Td className="text-forest">{row.source || "مباشر"}</Td>
            <Td>{row.medium || "—"}</Td>
            <Td className="max-w-52 break-words">{row.campaign || "بدون حملة"}</Td>
            <Td className="tnum">{row.orders}</Td>
            <Td className="tnum">{row.validOrders}</Td>
            <Td className="tnum text-forest">{formatPrice(row.revenue)}</Td>
            <Td className="tnum">{formatPrice(row.deliveredRevenue)}</Td>
            <Td className="tnum">{row.cancelledOrders}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default async function AttributionPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const report = await getAttribution(range);
  const coverage =
    report.totalOrders > 0 ? (report.attributedOrders / report.totalOrders) * 100 : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">الإسناد</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            مصدر كل طلب من روابط UTM وReferrer وصفحة الهبوط، بلمسة أولى ولمسة أخيرة. ربط
            الحملة يتم فقط عند تطابق utm_campaign مع حملة مسجلة — ولا يُخمَّن أو يُعاد
            إسناده إلى طلبات قديمة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "attribution" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href={rangeHref("/admin/marketing/reports/attribution", range)}
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory hover:bg-forest-deep"
          >
            تقرير قابل للطباعة
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/attribution" />

      {report.totalOrders > 0 && report.attributedOrders === 0 ? (
        <div className="border border-gold/40 bg-gold/10 px-4 py-3 text-[0.76rem] leading-6 text-forest">
          <strong>لا توجد طلبات ذات إسناد بعد:</strong> الطلبات المسجلة قبل تفعيل التتبع أو
          قبل إضافة بيانات UTM لا تحتوي على سجل إسناد. لن يتم اختراع مصدر لها.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">إجمالي الطلبات</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{report.totalOrders}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">طلبات لها سجل تتبع</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{report.attributedOrders}</p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">تغطية {percent(coverage)}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">بلا سجل تتبع</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{report.unattributedOrders}</p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">طلبات قبل التتبع أو خارج الجلسة</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">حملات مطابقة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{report.matchedCampaignOrders}</p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">UTM مطابق لحملة مسجلة</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">UTM بلا حملة مسجلة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{report.unmatchedCampaignOrders}</p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">لم يُنسب إلى أي حملة</p>
        </div>
      </div>

      <AdminCard
        title="الإسناد باللمسة الأخيرة"
        description="آخر مصدر معروف قبل إنشاء الطلب — المصدر المعتاد لتقييم الحملات."
        bodyClassName="p-0"
      >
        <AttributionTable rows={report.last} empty="لا توجد بيانات لمسة أخيرة" />
      </AdminCard>

      <AdminCard
        title="الإسناد باللمسة الأولى"
        description="أول مصدر جلب الزائر إلى الموقع — يوضح قناة الاكتشاف الأولى."
        bodyClassName="p-0"
      >
        <AttributionTable rows={report.first} empty="لا توجد بيانات لمسة أولى" />
      </AdminCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard
          title="أعلى المصادر الخارجية (Referrer)"
          description="آخر Referrer مسجل مع الطلب."
          bodyClassName="p-0"
        >
          {report.referrers.length === 0 ? (
            <div className="p-5">
              <EmptyState title="لا توجد إحالات مسجلة" />
            </div>
          ) : (
            <Table className="border-0">
              <thead>
                <tr>
                  <Th>المصدر</Th>
                  <Th>الطلبات</Th>
                  <Th>الإيراد</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/12 bg-ivory">
                {report.referrers.map((row, index) => (
                  <tr key={`${row.referrer}-${index}`}>
                    <Td className="max-w-80 break-words text-forest">
                      <span dir="ltr">{row.referrer || "مباشر / بلا إحالة"}</span>
                    </Td>
                    <Td className="tnum">{row.orders}</Td>
                    <Td className="tnum">{formatPrice(row.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AdminCard>

        <AdminCard
          title="صفحات الهبوط"
          description="آخر صفحة هبوط سُجلت مع الطلب."
          bodyClassName="p-0"
        >
          {report.landingPages.length === 0 ? (
            <div className="p-5">
              <EmptyState title="لا توجد صفحات هبوط مسجلة" />
            </div>
          ) : (
            <Table className="border-0">
              <thead>
                <tr>
                  <Th>الصفحة</Th>
                  <Th>الطلبات</Th>
                  <Th>الإيراد</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/12 bg-ivory">
                {report.landingPages.map((row, index) => (
                  <tr key={`${row.landingPage}-${index}`}>
                    <Td className="max-w-80 break-all text-forest">
                      <span dir="ltr">{row.landingPage || "غير مسجلة"}</span>
                    </Td>
                    <Td className="tnum">{row.orders}</Td>
                    <Td className="tnum">{formatPrice(row.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AdminCard>
      </div>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        الإسناد يُحفظ عند إنشاء الطلب من بيانات الزيارة في المتصفح: first touch وlast touch،
        مع UTM source/medium/campaign/content/term وreferrer وlanding page. لا تُحفظ أسماء
        العملاء أو هواتفهم أو عناوينهم في أي حدث تتبع أو تقرير تسويقي.
      </p>
    </div>
  );
}
