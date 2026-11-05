import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getGeography } from "@/lib/marketing";
import { formatPrice } from "@/lib/format";
import { AdminCard, EmptyState, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { HorizontalBarList } from "@/components/admin/marketing/Charts";

export const instant = false;

export const metadata = { title: "المحافظات · Admin" };

const percent = (value: number | null) =>
  value === null ? "غير متاح" : `${value.toFixed(1)}%`;

export default async function GeographyPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const rows = await getGeography(range);
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  const totals = rows.reduce(
    (acc, row) => ({
      orders: acc.orders + row.orders,
      revenue: acc.revenue + row.revenue,
      deliveredRevenue: acc.deliveredRevenue + row.deliveredRevenue,
      cancelled: acc.cancelled + row.cancelledOrders,
      delivered: acc.delivered + row.deliveredOrders,
    }),
    { orders: 0, revenue: 0, deliveredRevenue: 0, cancelled: 0, delivered: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">المحافظات</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            توزيع الطلبات والإيراد حسب المحافظة المسجلة عند إتمام الطلب. لا تُستنتج محافظة
            الزائر من عنوان IP أو من بيانات الشحن.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "geography" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href={rangeHref("/admin/marketing/reports/geography", range)}
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory hover:bg-forest-deep"
          >
            تقرير قابل للطباعة
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/geography" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">المحافظات</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{rows.length}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الطلبات</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{totals.orders}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الإيراد غير الملغي</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{formatPrice(totals.revenue)}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">إيراد التوصيل</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {formatPrice(totals.deliveredRevenue)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <AdminCard
          title="أعلى المحافظات بالإيراد"
          description="الإيراد من الطلبات غير الملغاة."
        >
          <HorizontalBarList
            items={sorted.slice(0, 10).map((row) => ({
              label: row.governorate,
              value: row.revenue,
              hint: `${row.orders} طلب · ${row.deliveredOrders} مُسلّم`,
            }))}
            format="currency"
            emptyLabel="لا توجد طلبات في الفترة."
          />
        </AdminCard>

        <AdminCard
          title="جودة الطلبات حسب المحافظة"
          description="نسبة التوصيل من الطلبات المحسومة (مُسلّمة + ملغاة)."
          bodyClassName="p-0"
        >
          {sorted.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="لا توجد بيانات محافظات"
                body="ستظهر المحافظات بعد تسجيل طلبات."
              />
            </div>
          ) : (
            <Table className="border-0">
              <thead>
                <tr>
                  <Th>المحافظة</Th>
                  <Th>الطلبات</Th>
                  <Th>المُسلّمة</Th>
                  <Th>الملغاة</Th>
                  <Th>نسبة الإلغاء</Th>
                  <Th>معدل التوصيل</Th>
                  <Th>AOV</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/12 bg-ivory">
                {sorted.map((row) => {
                  const resolved = row.deliveredOrders + row.cancelledOrders;
                  return (
                    <tr key={row.governorate} className="hover:bg-cream/30">
                      <Td className="min-w-32 text-forest">{row.governorate}</Td>
                      <Td className="tnum">{row.orders}</Td>
                      <Td className="tnum">{row.deliveredOrders}</Td>
                      <Td className="tnum">{row.cancelledOrders}</Td>
                      <Td className="tnum">
                        {row.orders > 0 ? percent((row.cancelledOrders / row.orders) * 100) : "—"}
                      </Td>
                      <Td className="tnum">
                        {resolved > 0 ? percent((row.deliveredOrders / resolved) * 100) : "—"}
                      </Td>
                      <Td className="tnum">
                        {row.averageOrderValue === null ? "—" : formatPrice(row.averageOrderValue)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </AdminCard>
      </div>

      <AdminCard
        title="التفاصيل الكاملة"
        description="«معدل التحويل» غير متاح لأن الموقع لا يجمع محافظة الزائر قبل الطلب."
        bodyClassName="p-0"
      >
        <Table className="border-0">
          <thead>
            <tr>
              <Th>المحافظة</Th>
              <Th>الطلبات</Th>
              <Th>غير الملغاة</Th>
              <Th>الإيراد</Th>
              <Th>إيراد التوصيل</Th>
              <Th>قيمة الملغاة</Th>
              <Th>معدل التحويل</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {sorted.map((row) => (
              <tr key={row.governorate} className="hover:bg-cream/30">
                <Td className="text-forest">{row.governorate}</Td>
                <Td className="tnum">{row.orders}</Td>
                <Td className="tnum">{row.validOrders}</Td>
                <Td className="tnum text-forest">{formatPrice(row.revenue)}</Td>
                <Td className="tnum">{formatPrice(row.deliveredRevenue)}</Td>
                <Td className="tnum">{formatPrice(row.cancelledRevenue)}</Td>
                <Td className="text-[0.7rem] text-ink-muted">غير متاح</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </AdminCard>
    </div>
  );
}
