import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listOrders, orderStats } from "@/lib/orders";
import { shipping } from "@/lib/config";
import { formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";

export const instant = false;

const statusLabel: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  shipped: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

export default async function AdminHome() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const stats = orderStats();
  const orders = listOrders(6);

  return (
    <div>
      <h1 className="text-[1.7rem]">نظرة عامة</h1>
      <p className="mt-1 text-[0.82rem] text-ink-muted">ملخص الطلبات المسجلة في قاعدة البيانات.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "إجمالي الطلبات", value: String(stats.count) },
          { label: "بانتظار التأكيد", value: String(stats.pending) },
          { label: "إجمالي المبيعات", value: formatPrice(stats.revenue) },
        ].map((s) => (
          <div key={s.label} className="border border-gold/20 bg-cream/25 p-5">
            <p className="text-[0.65rem] tracking-[0.18em] text-gold">{s.label}</p>
            <p className="tnum mt-2 text-[1.6rem] text-forest">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-[1.2rem]">أحدث الطلبات</h2>
        <Link href="/admin/orders" className="text-[0.78rem] text-ink-muted hover:text-forest">
          كل الطلبات
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="mt-4 border border-gold/20 bg-ivory p-6 text-[0.85rem] text-ink-muted">
          لا توجد طلبات بعد. أول طلب يتم من المتجر سيظهر هنا.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-gold/20">
          <table className="w-full min-w-[640px] border-collapse text-[0.82rem]">
            <thead className="bg-forest text-ivory">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">رقم الطلب</th>
                <th className="px-4 py-2.5 text-start font-medium">العميل</th>
                <th className="px-4 py-2.5 text-start font-medium">المحافظة</th>
                <th className="px-4 py-2.5 text-start font-medium">الإجمالي</th>
                <th className="px-4 py-2.5 text-start font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/12 bg-ivory">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.reference}`} className="text-forest underline decoration-gold/40 underline-offset-4">
                      {o.reference}
                    </Link>
                    <p className="text-[0.68rem] text-ink-muted">{formatDate(o.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{o.customer_name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {shipping.zones[o.governorate as keyof typeof shipping.zones]?.ar ?? o.governorate}
                  </td>
                  <td className="tnum px-4 py-3 text-forest">{formatPrice(o.total)}</td>
                  <td className="px-4 py-3 text-ink-muted">{statusLabel[o.status] ?? o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
