import Link from "next/link";
import { notFound } from "next/navigation";
import { setOrderStatusAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { getOrderByReference } from "@/lib/orders";
import { shipping } from "@/lib/config";
import { formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";

export const instant = false;

const statuses = [
  { value: "pending", label: "بانتظار التأكيد" },
  { value: "confirmed", label: "تم التأكيد" },
  { value: "shipped", label: "في الطريق" },
  { value: "delivered", label: "تم التوصيل" },
  { value: "cancelled", label: "ملغي" },
];

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const { reference } = await params;
  const result = getOrderByReference(reference);
  if (!result) notFound();
  const { order, items } = result;
  const zone = order.governorate as keyof typeof shipping.zones;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/orders" className="text-[0.78rem] text-ink-muted hover:text-forest">
        ← كل الطلبات
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.6rem]" dir="ltr">{order.reference}</h1>
          <p className="mt-1 text-[0.8rem] text-ink-muted">{formatDate(order.created_at)}</p>
        </div>
        <form action={setOrderStatusAction} className="flex items-center gap-2">
          <input type="hidden" name="reference" value={order.reference} />
          <label htmlFor="status" className="text-[0.75rem] text-ink-muted">الحالة</label>
          <select
            id="status"
            name="status"
            defaultValue={order.status}
            className="h-10 border border-forest/20 bg-ivory px-3 text-[0.8rem]"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-xs bg-forest px-4 text-[0.78rem] text-ivory hover:bg-forest-deep"
          >
            تحديث
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="border border-gold/20 bg-ivory p-5">
          <h2 className="text-[0.66rem] tracking-[0.2em] text-gold">العميل</h2>
          <p className="mt-3 text-[0.9rem] text-forest">{order.customer_name}</p>
          <p className="tnum text-[0.82rem] text-ink-muted" dir="ltr">{order.phone}</p>
          <p className="mt-2 text-[0.82rem] leading-7 text-ink-muted">
            {order.address}، {order.city}، {shipping.zones[zone]?.ar ?? order.governorate}
          </p>
          {order.notes ? (
            <p className="mt-3 border-s-2 border-gold/40 ps-3 text-[0.78rem] text-ink-muted">
              {order.notes}
            </p>
          ) : null}
        </div>

        <div className="border border-gold/20 bg-cream/25 p-5">
          <h2 className="text-[0.66rem] tracking-[0.2em] text-gold">الملخص</h2>
          <dl className="mt-3 space-y-2 text-[0.82rem]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">المجموع الفرعي</dt>
              <dd className="tnum text-forest">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">الشحن</dt>
              <dd className="tnum text-forest">{formatPrice(order.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-gold/20 pt-2">
              <dt className="text-forest">الإجمالي</dt>
              <dd className="tnum font-medium text-forest">{formatPrice(order.total)}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-ink-muted">الدفع</dt>
              <dd className="text-forest">{order.payment_method === "cod" ? "عند الاستلام" : "إنستاباي"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 overflow-hidden border border-gold/20">
        <table className="w-full border-collapse text-[0.82rem]">
          <thead className="bg-forest text-ivory">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">المنتج</th>
              <th className="px-4 py-2.5 text-start font-medium">الحجم</th>
              <th className="px-4 py-2.5 text-start font-medium">الكمية</th>
              <th className="px-4 py-2.5 text-start font-medium">السعر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-forest">{item.name_ar}</td>
                <td className="px-4 py-3 text-ink-muted">{item.size_ar}</td>
                <td className="tnum px-4 py-3 text-ink-muted">{item.qty}</td>
                <td className="tnum px-4 py-3 text-forest">{formatPrice(item.unit_price * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
