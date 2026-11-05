import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { getCustomerAnalytics } from "@/lib/marketing";
import { formatNumber, formatPrice } from "@/lib/format";
import { AdminCard, Table, Td, Th } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";
import { CustomerTrendChart } from "@/components/admin/marketing/Charts";

export const instant = false;

export const metadata = { title: "اكتساب العملاء · Admin" };

type Grouping = "day" | "week" | "month";

const groupings: { value: Grouping; label: string }[] = [
  { value: "day", label: "يومي" },
  { value: "week", label: "أسبوعي" },
  { value: "month", label: "شهري" },
];

const money = (value: number | null) => (value === null ? "غير متاح" : formatPrice(value));
const count = (value: number | null) =>
  value === null ? "غير متاح" : formatNumber(Math.round(value), "en");
const percent = (value: number | null) =>
  value === null ? "غير متاح" : `${value.toFixed(1)}%`;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    group?: string;
  }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);
  const fallback: Grouping = range.days <= 45 ? "day" : range.days <= 180 ? "week" : "month";
  const requested = params.group;
  const grouping: Grouping =
    requested === "day" || requested === "week" || requested === "month"
      ? requested
      : fallback;

  const customers = await getCustomerAnalytics(range, grouping);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">اكتساب العملاء</h1>
          <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
            العميل الجديد هو من كان أول طلب غير ملغي له داخل الفترة. العميل العائد هو من
            سبق له الطلب قبل بداية الفترة ثم عاد للطلب فيها. يتم التمييز برقم الهاتف المخزن
            في الطلب، ولا تُعرض أي بيانات شخصية هنا.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href={rangeHref("/admin/marketing/export", range, { type: "customers" })}
            className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest hover:border-forest hover:bg-forest hover:text-ivory"
          >
            ⬇ CSV
          </Link>
          <Link
            href={rangeHref("/admin/marketing/reports/customers", range)}
            className="inline-flex h-9 items-center rounded-xs bg-forest px-3.5 text-[0.74rem] text-ivory hover:bg-forest-deep"
          >
            تقرير قابل للطباعة
          </Link>
        </div>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/customers" />

      <div className="flex flex-wrap items-center gap-1.5 print:hidden">
        <span className="text-[0.68rem] text-ink-muted">التجميع:</span>
        {groupings.map((option) => (
          <Link
            key={option.value}
            href={rangeHref("/admin/marketing/customers", range, { group: option.value })}
            className={
              grouping === option.value
                ? "inline-flex h-8 items-center rounded-xs border border-forest bg-forest px-2.5 text-[0.72rem] text-ivory"
                : "inline-flex h-8 items-center rounded-xs border border-forest/20 px-2.5 text-[0.72rem] text-forest hover:border-forest/60"
            }
          >
            {option.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">عملاء جدد</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{count(customers.newCustomers)}</p>
          <p className="mt-1 text-[0.66rem] text-ink-muted">أول طلب غير ملغي داخل الفترة</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">عملاء عائدون</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">
            {count(customers.returningCustomers)}
          </p>
          <p className="mt-1 text-[0.66rem] text-ink-muted">سبق الشراء قبل الفترة وعادوا</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">إجمالي العملاء</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{count(customers.totalCustomers)}</p>
          <p className="mt-1 text-[0.66rem] text-ink-muted">أرقام هواتف فريدة بطلبات غير ملغاة</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الطلبات</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{count(customers.orders)}</p>
          <p className="mt-1 text-[0.66rem] text-ink-muted">
            الإيراد: {formatPrice(customers.revenue)}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">متوسط قيمة الطلب</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{money(customers.averageOrderValue)}</p>
          <p className="mt-1 text-[0.66rem] text-ink-muted">الإيراد ÷ الطلبات غير الملغاة</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">تكلفة اكتساب العميل (CAC)</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{money(customers.cac)}</p>
          <p className="mt-1 text-[0.66rem] text-ink-muted">
            المصاريف الإعلانية ÷ العملاء الجدد — تتطلب مصاريف مسجلة
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">القيمة الدائمة (LTV)</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">{money(customers.ltv)}</p>
          <p className="mt-1 text-[0.66rem] leading-5 text-ink-muted">{customers.ltvNote}</p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">معدل الشراء المتكرر</p>
          <p className="tnum mt-1 text-[1.15rem] text-forest">
            {percent(customers.repeatPurchaseRate)}
          </p>
          <p className="mt-1 text-[0.66rem] text-ink-muted">
            عملاء لديهم طلبان غير ملغيين أو أكثر — عبر كامل تاريخ المتجر
          </p>
        </div>
      </div>

      <AdminCard
        title="العملاء الجدد والعائدون"
        description="يُحتسب العميل جديدًا في الفترة التي وقع فيها أول طلب له، وعائدًا في الفترات اللاحقة."
      >
        <CustomerTrendChart points={customers.trend} />
      </AdminCard>

      <AdminCard
        title="تفاصيل الفترات"
        description="نفس التجميع المستخدم في الرسم."
        bodyClassName="p-0"
      >
        <Table className="border-0">
          <thead>
            <tr>
              <Th>الفترة</Th>
              <Th>عملاء جدد</Th>
              <Th>عملاء عائدون</Th>
              <Th>الطلبات</Th>
              <Th>الإيراد</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {customers.trend.map((point) => (
              <tr key={point.key} className="hover:bg-cream/30">
                <Td className="text-forest">{point.label}</Td>
                <Td className="tnum">{point.newCustomers}</Td>
                <Td className="tnum">{point.returningCustomers}</Td>
                <Td className="tnum">{point.orders}</Td>
                <Td className="tnum text-forest">{formatPrice(point.revenue)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </AdminCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">متوسط الطلبات لكل عميل</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {customers.averageOrdersPerCustomer === null
              ? "غير متاح"
              : customers.averageOrdersPerCustomer.toFixed(2)}
          </p>
        </div>
        <div className="border border-gold/20 bg-ivory px-4 py-3">
          <p className="text-[0.65rem] text-gold">الإيراد لكل عميل</p>
          <p className="tnum mt-1 text-[1.05rem] text-forest">
            {money(customers.revenuePerCustomer)}
          </p>
        </div>
      </div>

      <p className="text-[0.7rem] leading-6 text-ink-muted">
        LTV يظهر فقط بعد توفر 20 طلبًا مُسلّمًا على الأقل، و5 عملاء مُسلّمين على الأقل،
        وتاريخ توصيل لا يقل عن 90 يومًا. قبل ذلك يظهر سبب عدم الإتاحة بدل رقم مضلل.
      </p>
    </div>
  );
}
