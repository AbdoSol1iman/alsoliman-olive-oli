import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getFunnel } from "@/lib/marketing";
import { AdminCard, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { FunnelBars } from "@/components/admin/marketing/Charts";

export const instant = false;

export const metadata = { title: "مسار التحويل · Admin" };

const number = (value: number | null) =>
  value === null ? "غير متاح" : value.toLocaleString("en-US");

const percent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const funnel = await getFunnel(range);

  const warnings = funnel.stages.filter((stage) => stage.warning);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">مسار التحويل</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            المراحل الأربع الأولى بالجلسات الفريدة المسجلة في التتبع، والمراحل الأخيرة بعدد
            الطلبات الفعلية. كل مرحلة تعرض التحويل من سابقتها ونسبة التسرّب.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/cod", range)}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
          >
            جودة COD
          </Link>
          <Link
            href={rangeHref("/admin/marketing/reports/overview", range)}
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory hover:bg-forest-deep"
          >
            تقرير قابل للطباعة
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/funnel" />

      {!funnel.trackingAvailable ? (
        <div className="border border-gold/40 bg-gold/10 px-4 py-3 text-[0.76rem] leading-6 text-forest">
          <strong>التتبع غير متاح لهذه الفترة:</strong> لا توجد أحداث مسجلة، لذلك مراحل
          الزيارة والمنتج والسلة وإتمام الطلب تظهر «غير متاح» بدل الصفر. مراحل الطلبات
          والتأكيد والتوصيل تُقرأ من قاعدة البيانات وتظل متاحة.
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="border border-red-800/25 bg-red-50/40 px-4 py-3 text-[0.76rem] leading-6 text-red-900">
          {warnings.map((stage) => (
            <p key={stage.key}>{stage.warning}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الطلبات المُنشأة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {number(funnel.orders.totalOrders)}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الطلبات المؤكدة أو أبعد</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {number(funnel.orders.confirmedOrders)}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">المُسلّمة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {number(funnel.orders.deliveredOrders)}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الملغاة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {number(funnel.orders.cancelledOrders)}
          </p>
        </div>
      </div>

      <AdminCard
        title="مسار التحويل المرئي"
        description="عرض مقارن للمراحل — العرض لا يعني نسبة تحويل واحدة موحّدة."
      >
        <FunnelBars stages={funnel.stages} />
      </AdminCard>

      <AdminCard
        title="تفاصيل المراحل"
        description="«من السابق» = قيمة المرحلة ÷ قيمة المرحلة السابقة × 100."
        bodyClassName="p-0"
      >
        <Table className="border-0">
          <thead>
            <tr>
              <Th>المرحلة</Th>
              <Th>القيمة</Th>
              <Th>من السابق</Th>
              <Th>التسرّب</Th>
              <Th>طريقة الحساب</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {funnel.stages.map((stage) => (
              <tr key={stage.key} className="align-top">
                <Td className="min-w-44 text-forest">{stage.label}</Td>
                <Td className="tnum">{number(stage.value)}</Td>
                <Td className="tnum">{percent(stage.conversionFromPrevious)}</Td>
                <Td className="tnum">{percent(stage.dropOff)}</Td>
                <Td className="max-w-96 text-[0.72rem] leading-6">{stage.note}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </AdminCard>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        المراحل الأخيرة تُقاس بعدد الطلبات لأن حالة كل طلب محفوظة في قاعدة البيانات، بينما
        المراحل الأولى تُقاس بجلسات التتبع. لذلك قد تتجاوز نسبة التحويل 100% عند وجود فجوة
        تتبع أو عند اختلاف وحدات القياس — ويظهر تحذير صريح بدل إخفاء ذلك.
      </p>
    </div>
  );
}
