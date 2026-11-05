import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getCodAnalytics } from "@/lib/marketing";
import { formatNumber, formatPrice } from "@/lib/format";
import { AdminCard, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { HorizontalBarList } from "@/components/admin/marketing/Charts";

export const instant = false;

export const metadata = { title: "جودة طلبات COD · Admin" };

const percent = (value: number | null) =>
  value === null ? "غير متاح" : `${value.toFixed(1)}%`;

export default async function CodPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const cod = await getCodAnalytics(range);

  const statuses = [
    { label: "بانتظار التأكيد", value: cod.pendingOrders },
    { label: "تم التأكيد", value: cod.confirmedOrders },
    { label: "قيد التجهيز", value: cod.processingOrders },
    { label: "في الطريق", value: cod.shippedOrders },
    { label: "تم التوصيل", value: cod.deliveredOrders },
    { label: "ملغي", value: cod.cancelledOrders },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">جودة طلبات الدفع عند الاستلام</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            حالة كل طلب كما هي مسجلة الآن، مع فصل صريح بين الإيراد غير الملغي، وإيراد
            الطلبات المُسلّمة، وقيمة الطلبات المعلّقة والملغاة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "cod" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href={rangeHref("/admin/marketing/reports/cod", range)}
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory hover:bg-forest-deep"
          >
            تقرير قابل للطباعة
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/cod" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">إجمالي الطلبات</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{cod.totalOrders}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الإيراد غير الملغي</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{formatPrice(cod.grossRevenue)}</p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">لا يشمل الطلبات الملغاة</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">إيراد الطلبات المُسلّمة</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">
            {formatPrice(cod.deliveredRevenue)}
          </p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">المُحقّق فعليًا فقط</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">قيمة الطلبات المعلّقة</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{formatPrice(cod.pendingRevenue)}</p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">ليست إيرادًا محققًا</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">قيمة الطلبات الملغاة</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">
            {formatPrice(cod.cancelledRevenue)}
          </p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">مستبعدة من كل مؤشرات الإيراد</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">متوسط قيمة الطلب</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">
            {cod.averageOrderValue === null ? "غير متاح" : formatPrice(cod.averageOrderValue)}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">معدل نجاح التوصيل</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">
            {percent(cod.deliverySuccessRate)}
          </p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">
            المُسلّمة ÷ (المُسلّمة + الملغاة)
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">معدل الإلغاء</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{percent(cod.cancellationRate)}</p>
          <p className="mt-1 text-[0.64rem] text-ink-muted">الملغاة ÷ كل الطلبات</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <AdminCard
          title="توزيع الطلبات على الحالات"
          description="حالة الطلب الحالية — وليست سجلًا زمنيًا لكل انتقال."
        >
          <HorizontalBarList
            items={statuses.map((status) => ({
              label: status.label,
              value: status.value,
            }))}
            format="number"
            emptyLabel="لا توجد طلبات في الفترة."
          />
        </AdminCard>

        <AdminCard
          title="مؤشرات التشغيل"
          description="ما يمكن قياسه من بيانات الطلبات الحالية، وما لا يمكن."
          bodyClassName="p-0"
        >
          <Table className="border-0">
            <thead>
              <tr>
                <Th>المؤشر</Th>
                <Th>القيمة</Th>
                <Th>ملاحظة</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/12 bg-ivory">
              <tr>
                <Td className="text-forest">طلبات مؤكدة أو أبعد</Td>
                <Td className="tnum">{cod.confirmedPlusOrders}</Td>
                <Td className="text-[0.7rem]">
                  تشمل المؤكدة وقيد التجهيز وفي الطريق والمُسلّمة — حسب الحالة الحالية.
                </Td>
              </tr>
              <tr>
                <Td className="text-forest">فتح رابط واتساب (طلب فريد)</Td>
                <Td className="tnum">
                  {cod.whatsappOpenedOrders === null
                    ? "غير متاح"
                    : formatNumber(cod.whatsappOpenedOrders, "en")}
                </Td>
                <Td className="text-[0.7rem]">
                  يمثل محاولة فتح الرابط فقط — لا يعني أن الرسالة أُرسلت أو أن العميل ردّ.
                </Td>
              </tr>
              <tr>
                <Td className="text-forest">عملاء غير قابلين للوصول</Td>
                <Td className="text-[0.72rem]">غير متتبع</Td>
                <Td className="text-[0.7rem]">
                  لا توجد حالة «غير قابل للوصول» في نموذج الطلب الحالي، ولا يتم اختلاقها.
                </Td>
              </tr>
              <tr>
                <Td className="text-forest">معدل التحويل الجغرافي</Td>
                <Td className="text-[0.72rem]">غير متاح</Td>
                <Td className="text-[0.7rem]">
                  لا يُجمع موقع الزائر قبل الطلب، ولا يُستنتج من محافظة الشحن.
                </Td>
              </tr>
            </tbody>
          </Table>
        </AdminCard>
      </div>

      <AdminCard
        title="سجل الحالات"
        description="عدد الطلبات في كل حالة وقيمتها المالية."
        bodyClassName="p-0"
      >
        <Table className="border-0">
          <thead>
            <tr>
              <Th>الحالة</Th>
              <Th>عدد الطلبات</Th>
              <Th>القيمة</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            <tr>
              <Td className="text-forest">بانتظار التأكيد</Td>
              <Td className="tnum">{cod.pendingOrders}</Td>
              <Td className="tnum">{formatPrice(cod.pendingRevenue)}</Td>
            </tr>
            <tr>
              <Td className="text-forest">تم التأكيد</Td>
              <Td className="tnum">{cod.confirmedOrders}</Td>
              <Td className="text-[0.7rem] text-ink-muted">
                ضمن الإيراد غير الملغي
              </Td>
            </tr>
            <tr>
              <Td className="text-forest">قيد التجهيز</Td>
              <Td className="tnum">{cod.processingOrders}</Td>
              <Td className="text-[0.7rem] text-ink-muted">
                ضمن الإيراد غير الملغي
              </Td>
            </tr>
            <tr>
              <Td className="text-forest">في الطريق</Td>
              <Td className="tnum">{cod.shippedOrders}</Td>
              <Td className="text-[0.7rem] text-ink-muted">
                ليس إيرادًا مُسلّمًا بعد
              </Td>
            </tr>
            <tr>
              <Td className="text-forest">تم التوصيل</Td>
              <Td className="tnum">{cod.deliveredOrders}</Td>
              <Td className="tnum">{formatPrice(cod.deliveredRevenue)}</Td>
            </tr>
            <tr>
              <Td className="text-forest">ملغي</Td>
              <Td className="tnum">{cod.cancelledOrders}</Td>
              <Td className="tnum">{formatPrice(cod.cancelledRevenue)}</Td>
            </tr>
          </tbody>
        </Table>
      </AdminCard>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        لا يُحتسب أي طلب ملغى أو غير مُسلّم ضمن «إيراد التوصيل». معدل نجاح التوصيل يستخدم
        الطلبات المحسومة فقط (مُسلّمة + ملغاة)، لأن الطلبات المعلّقة لم تُحسم بعد.
      </p>
    </div>
  );
}
