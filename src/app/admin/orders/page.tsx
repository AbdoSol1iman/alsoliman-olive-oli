import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listOrders } from "@/lib/orders";
import { cx, formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";

export const instant = false;

const statusLabel: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  shipped: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const filters = [
  { value: "", label: "الكل" },
  { value: "pending", label: "بانتظار التأكيد" },
  { value: "confirmed", label: "تم التأكيد" },
  { value: "shipped", label: "في الطريق" },
  { value: "delivered", label: "تم التوصيل" },
  { value: "cancelled", label: "ملغي" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const { status } = await searchParams;
  const orders = listOrders(100, status);

  return (
    <div>
      <h1 className="text-[1.7rem]">الطلبات</h1>
      <p className="mt-1 text-[0.82rem] text-ink-muted">
        {orders.length} طلب مسجل. اضغط على رقم الطلب لعرض التفاصيل وتحديث الحالة.
      </p>

      <nav aria-label="تصفية حسب الحالة" className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = (status ?? "") === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={f.value ? `/admin/orders?status=${f.value}` : "/admin/orders"}
              className={cx(
                "rounded-full border px-3.5 py-1.5 text-[0.74rem] transition-colors",
                active
                  ? "border-forest bg-forest text-ivory"
                  : "border-gold/30 bg-ivory text-ink-muted hover:border-forest/40 hover:text-forest",
              )}
              aria-current={active ? "page" : undefined}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-6 border border-gold/20 bg-ivory p-6 text-[0.85rem] text-ink-muted">
          لا توجد طلبات بهذا التصنيف.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-gold/20">
          <table className="w-full min-w-[760px] border-collapse text-[0.82rem]">
            <thead className="bg-forest text-ivory">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">رقم الطلب</th>
                <th className="px-4 py-2.5 text-start font-medium">التاريخ</th>
                <th className="px-4 py-2.5 text-start font-medium">العميل</th>
                <th className="px-4 py-2.5 text-start font-medium">الهاتف</th>
                <th className="px-4 py-2.5 text-start font-medium">الإجمالي</th>
                <th className="px-4 py-2.5 text-start font-medium">الدفع</th>
                <th className="px-4 py-2.5 text-start font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/12 bg-ivory">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-cream/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.reference}`} className="text-forest underline decoration-gold/40 underline-offset-4">
                      {o.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[0.72rem] text-ink-muted">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-ink-muted">{o.customer_name}</td>
                  <td className="tnum px-4 py-3 text-ink-muted" dir="ltr">{o.phone}</td>
                  <td className="tnum px-4 py-3 text-forest">{formatPrice(o.total)}</td>
                  <td className="px-4 py-3 text-[0.72rem] text-ink-muted">
                    {o.payment_method === "cod" ? "عند الاستلام" : "إنستاباي"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-gold/30 px-2.5 py-1 text-[0.68rem] text-forest">
                      {statusLabel[o.status] ?? o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
