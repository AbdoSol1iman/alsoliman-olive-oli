import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { countOrders, listOrders, ORDER_STATUSES } from "@/lib/orders";
import { formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";
import { EmptyState, STATUS_LABELS, StatusBadge, Table, Td, Th } from "@/components/admin/ui";

export const instant = false;

export const metadata = { title: "الطلبات · Admin" };

const statusFilters = [
  { value: "", label: "الكل" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string; page?: string }>;
}) {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const { status = "", q = "", from = "", to = "", page = "1" } = await searchParams;

  const query = { status, q, from, to };
  const pageSize = 25;
  const currentPage = Math.max(1, Number(page) || 1);
  const total = await countOrders(query);
  const orders = await listOrders({ ...query, limit: pageSize, offset: (currentPage - 1) * pageSize });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const qs = (next: Record<string, string>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, from, to, ...next })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  const hasFilters = Boolean(status || q || from || to);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">الطلبات</h1>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            {total} طلب. اضغط على رقم الطلب لعرض التفاصيل وتحديث الحالة وطباعة الفاتورة.
          </p>
        </div>
        <a
          href={`/admin/orders/export?${new URLSearchParams(
            Object.entries({ status, q, from, to }).filter(([, v]) => v),
          )}`}
          className="inline-flex h-11 items-center rounded-xs border border-forest/25 px-4 text-[0.78rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory"
        >
          ⬇ تصدير CSV
        </a>
      </div>

      {/* Search + date filters */}
      <form method="get" action="/admin/orders" className="border border-gold/20 bg-ivory p-4">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[0.75rem] text-forest">بحث (رقم الطلب، الاسم، الهاتف)</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="SLM-… أو 010…"
              dir="auto"
              className="h-10 w-full border border-forest/20 bg-ivory px-3 text-[0.82rem] text-charcoal outline-none focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.75rem] text-forest">من تاريخ</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-10 w-full border border-forest/20 bg-ivory px-3 text-[0.82rem] text-charcoal outline-none focus:border-gold"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.75rem] text-forest">إلى تاريخ</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-10 w-full border border-forest/20 bg-ivory px-3 text-[0.82rem] text-charcoal outline-none focus:border-gold"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-10 rounded-xs bg-forest px-4 text-[0.78rem] text-ivory transition-colors hover:bg-forest-deep"
            >
              بحث
            </button>
            {hasFilters ? (
              <Link
                href="/admin/orders"
                className="h-10 rounded-xs border border-forest/20 px-3 text-[0.75rem] leading-10 text-ink-muted hover:text-forest"
              >
                مسح
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      {/* Status pills */}
      <nav aria-label="تصفية حسب الحالة" className="flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const active = status === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={qs({ status: f.value, page: "" })}
              className={
                active
                  ? "rounded-full border border-forest bg-forest px-3.5 py-1.5 text-[0.74rem] text-ivory"
                  : "rounded-full border border-gold/30 bg-ivory px-3.5 py-1.5 text-[0.74rem] text-ink-muted transition-colors hover:border-forest/40 hover:text-forest"
              }
              aria-current={active ? "page" : undefined}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title={hasFilters ? "لا توجد طلبات مطابقة للبحث" : "لا توجد طلبات بعد"}
          body={hasFilters ? "جرّب كلمات بحث أو تواريخ أخرى." : "أول طلب من المتجر يظهر هنا مباشرة."}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>رقم الطلب</Th>
              <Th>التاريخ</Th>
              <Th>العميل</Th>
              <Th>الهاتف</Th>
              <Th>الإجمالي</Th>
              <Th>الدفع</Th>
              <Th>الحالة</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-cream/30">
                <Td>
                  <Link
                    href={`/admin/orders/${o.reference}`}
                    className="text-forest underline decoration-gold/40 underline-offset-4"
                    dir="ltr"
                  >
                    {o.reference}
                  </Link>
                </Td>
                <Td className="text-[0.72rem]">{formatDate(o.created_at)}</Td>
                <Td>{o.customer_name}</Td>
                <Td className="tnum" >
                  <span dir="ltr">{o.phone}</span>
                </Td>
                <Td className="tnum text-forest">{formatPrice(o.total)}</Td>
                <Td className="text-[0.72rem]">
                  {o.payment_method === "cod" ? "عند الاستلام" : "إنستاباي"}
                </Td>
                <Td>
                  <StatusBadge status={o.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3 text-[0.78rem]">
          <span className="text-ink-muted">
            صفحة {currentPage} من {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link
                href={qs({ page: String(currentPage - 1) })}
                className="rounded-xs border border-forest/20 px-3 py-1.5 text-forest hover:bg-forest hover:text-ivory"
              >
                السابق
              </Link>
            ) : null}
            {currentPage < totalPages ? (
              <Link
                href={qs({ page: String(currentPage + 1) })}
                className="rounded-xs border border-forest/20 px-3 py-1.5 text-forest hover:bg-forest hover:text-ivory"
              >
                التالي
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
