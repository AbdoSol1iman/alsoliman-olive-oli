import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getProductPerformance } from "@/lib/marketing";
import { formatNumber, formatPrice } from "@/lib/format";
import { AdminCard, EmptyState, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { HorizontalBarList } from "@/components/admin/marketing/Charts";

export const instant = false;

export const metadata = { title: "أداء المنتجات تسويقيًا · Admin" };

const money = (value: number | null) => (value === null ? "غير متاح" : formatPrice(value));
const percent = (value: number | null) =>
  value === null ? "غير متاح" : `${value.toFixed(1)}%`;
const count = (value: number | null) =>
  value === null ? "غير متاح" : formatNumber(value, "en");

export default async function ProductMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const products = await getProductPerformance(range);
  const sorted = [...products].sort((a, b) => b.revenue - a.revenue);
  const anyTracking = products.some((product) => product.views !== null);
  const top = sorted.slice(0, 8).map((product) => ({
    label: product.name,
    value: product.revenue,
    hint: `${product.orders} طلب · ${product.units} وحدة`,
  }));

  const totals = products.reduce(
    (acc, product) => ({
      revenue: acc.revenue + product.revenue,
      deliveredRevenue: acc.deliveredRevenue + product.deliveredRevenue,
      orders: acc.orders + product.orders,
      units: acc.units + product.units,
      spend: product.spend === null ? acc.spend : (acc.spend ?? 0) + product.spend,
    }),
    { revenue: 0, deliveredRevenue: 0, orders: 0, units: 0, spend: null as number | null },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">أداء المنتجات تسويقيًا</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            الطلبات والإيراد من أسطر الطلبات الفعلية، والمصاريف من الحملات المرتبطة بالمنتج.
            مشاهدات المنتج ومعدل التحويل يعتمدان على أحداث ViewContent المسجلة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "products" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href={rangeHref("/admin/marketing/reports/products", range)}
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory hover:bg-forest-deep"
          >
            تقرير قابل للطباعة
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/products" />

      {!anyTracking ? (
        <div className="border border-gold/40 bg-gold/10 px-4 py-3 text-[0.76rem] leading-6 text-forest">
          <strong>تتبع المنتجات غير متاح:</strong> لا توجد أحداث ViewContent في هذه الفترة،
          لذلك مشاهدات المنتج ومعدل التحويل يظهران «غير متاح». بيانات الطلبات والإيراد
          والمصاريف المرتبطة بالحملات تظل متاحة.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">المنتجات المباعة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{products.length}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الطلبات</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{totals.orders}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الوحدات</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{totals.units}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">إيراد المنتجات</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">{formatPrice(totals.revenue)}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">المصاريف المرتبطة</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {totals.spend === null ? "غير مسجلة" : formatPrice(totals.spend)}
          </p>
        </div>
      </div>

      <AdminCard
        title="أعلى المنتجات بالإيراد"
        description="الإيراد من الطلبات غير الملغاة، وليس إيراد المنصات المعلن."
      >
        <HorizontalBarList items={top} format="currency" emptyLabel="لا توجد مبيعات منتجات في الفترة." />
      </AdminCard>

      <AdminCard
        title={`${products.length} منتج`}
        description="معدل التحويل = طلبات المنتج ÷ جلسات مشاهدة المنتج × 100 — وقد يتجاوز 100% عند وجود فجوة في التتبع."
        bodyClassName="p-0"
      >
        {sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="لا توجد بيانات منتجات"
              body="ستظهر المنتجات هنا بعد تسجيل طلبات تحتوي عليها."
            />
          </div>
        ) : (
          <Table className="border-0">
            <thead>
              <tr>
                <Th>المنتج</Th>
                <Th>الطلبات</Th>
                <Th>الملغاة</Th>
                <Th>معدل الإلغاء</Th>
                <Th>الوحدات</Th>
                <Th>الإيراد</Th>
                <Th>إيراد التوصيل</Th>
                <Th>المصاريف</Th>
                <Th>ROAS</Th>
                <Th>مشاهدات المنتج</Th>
                <Th>معدل التحويل</Th>
                <Th>الأحجام</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/12 bg-ivory">
              {sorted.map((product) => (
                <tr key={product.id} className="align-top hover:bg-cream/30">
                  <Td className="min-w-48">
                    <p className="text-forest">{product.name}</p>
                    <p className="mt-0.5 text-[0.66rem] text-ink-muted" dir="ltr">
                      {product.nameEn}
                    </p>
                  </Td>
                  <Td className="tnum">{product.orders}</Td>
                  <Td className="tnum">{product.cancelledOrders}</Td>
                  <Td className="tnum">{percent(product.cancellationRate)}</Td>
                  <Td className="tnum">{count(product.units)}</Td>
                  <Td className="tnum text-forest">{formatPrice(product.revenue)}</Td>
                  <Td className="tnum">{formatPrice(product.deliveredRevenue)}</Td>
                  <Td className="tnum">{money(product.spend)}</Td>
                  <Td className="tnum">
                    {product.roas === null ? "غير متاح" : `${product.roas.toFixed(2)}×`}
                  </Td>
                  <Td className="tnum">{count(product.views)}</Td>
                  <Td className="tnum">{percent(product.conversionRate)}</Td>
                  <Td>
                    {product.variants.length === 0 ? (
                      <span className="text-[0.7rem] text-ink-muted">—</span>
                    ) : (
                      <details className="min-w-36">
                        <summary className="cursor-pointer text-[0.7rem] text-forest">
                          {product.variants.length} حجم
                        </summary>
                        <ul className="mt-1.5 space-y-1">
                          {product.variants.map((variant) => (
                            <li key={variant.id} className="text-[0.66rem] leading-5 text-ink-muted">
                              {variant.name}: {variant.units} وحدة · {formatPrice(variant.revenue)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AdminCard>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        المصاريف المرتبطة بالمنتج تشمل فقط الحملات التي حددت المنتج في إعدادات الحملة. لا
        يتم توزيع مصاريف حملة غير مرتبطة على المنتجات تخمينًا.
      </p>
    </div>
  );
}
