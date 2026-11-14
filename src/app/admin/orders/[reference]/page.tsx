import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrderByReference, getOrderNotes, getOrderStatusHistory } from "@/lib/orders";
import { getSettingsAdmin } from "@/lib/settings";
import { formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";
import { AdminCard, StatusBadge } from "@/components/admin/ui";
import { STATUS_LABELS } from "@/lib/order-status";
import { OrderDeleteButton, OrderNotes, OrderStatusForm } from "@/components/admin/OrderPanels";

export const instant = false;

export const metadata = { title: "تفاصيل الطلب · Admin" };

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const { reference } = await params;
  const result = await getOrderByReference(reference);
  if (!result) notFound();
  const { order, items } = result;
  const [notes, settings] = await Promise.all([
    getOrderNotes(order.id),
    getSettingsAdmin(),
  ]);
  const history = await getOrderStatusHistory(order.id);
  const zone = settings.shipping.zones[order.governorate];
  const waHref = `https://wa.me/${order.phone.replace(/\D/g, "")}`;

  const subtotalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-[0.78rem]">
        <Link href="/admin/orders" className="text-ink-muted hover:text-forest">
          ← كل الطلبات
        </Link>
        <Link
          href={`/admin/orders/${order.reference}/invoice`}
          target="_blank"
          className="rounded-xs border border-forest/20 px-3 py-1.5 text-forest hover:bg-forest hover:text-ivory"
        >
          🖨 فاتورة الطباعة
        </Link>
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-xs border border-forest/20 px-3 py-1.5 text-forest hover:bg-forest hover:text-ivory"
        >
          واتساب العميل
        </a>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.6rem] text-forest" dir="ltr">
            {order.reference}
          </h1>
          <p className="mt-1 text-[0.8rem] text-ink-muted">
            {formatDate(order.created_at)} · {items.length} صنف · {subtotalQty} وحدة
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <AdminCard title="العميل">
          <p className="text-[0.92rem] text-forest">{order.customer_name}</p>
          <p className="tnum mt-1 text-[0.84rem] text-ink-muted" dir="ltr">
            {order.phone}
          </p>
          {order.phone2 ? (
            <p className="tnum mt-1 text-[0.8rem] text-ink-muted" dir="ltr">
              هاتف إضافي: {order.phone2}
            </p>
          ) : null}
          <p className="mt-2 text-[0.82rem] leading-7 text-ink-muted">
            {order.address}، {order.city}، {zone?.ar ?? order.governorate}
          </p>
          <p className="mt-2 text-[0.78rem] text-ink-muted">
            الدفع: {order.payment_method === "cod" ? "عند الاستلام (COD)" : "إنستاباي"}
          </p>
          {order.notes ? (
            <p className="mt-3 border-s-2 border-gold/40 ps-3 text-[0.78rem] leading-6 text-ink-muted">
              ملاحظات العميل: {order.notes}
            </p>
          ) : null}
        </AdminCard>

        <AdminCard title="الملخص">
          <dl className="space-y-2 text-[0.84rem]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">المجموع الفرعي</dt>
              <dd className="tnum text-forest">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">الشحن</dt>
              <dd className="tnum text-forest">
                {order.shipping === 0 ? "مجاني" : formatPrice(order.shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gold/20 pt-2">
              <dt className="text-forest">الإجمالي</dt>
              <dd className="tnum font-medium text-forest">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </AdminCard>
      </div>

      <AdminCard title="الأصناف">
        <ul className="divide-y divide-gold/12">
          {items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[0.84rem]">
              <div className="min-w-0">
                <p className="truncate text-forest">{item.name_ar}</p>
                <p className="text-[0.7rem] text-ink-muted">
                  {item.size_ar} · {formatPrice(item.unit_price)} × {item.qty}
                </p>
              </div>
              <span className="tnum shrink-0 text-forest">{formatPrice(item.unit_price * item.qty)}</span>
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard
        title="سجل الحالة"
        description="كل تغيير حالة يُسجَّل باسم من قام به. لا يتأكد الطلب تلقائيًا من فتح واتساب — التأكيد إجراء يدوي من هنا فقط."
      >
        {history.length === 0 ? (
          <p className="text-[0.8rem] text-ink-muted">لا يوجد سجل بعد.</p>
        ) : (
          <ul className="divide-y divide-gold/12">
            {history.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[0.8rem]"
              >
                <span className="text-forest">
                  {STATUS_LABELS[event.status] ?? event.status}
                </span>
                <span className="text-ink-muted">
                  {formatDate(event.changed_at)} ·{" "}
                  {event.source === "admin"
                    ? event.changed_by || "مدير"
                    : "النظام — إنشاء الطلب"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <div className="grid gap-5 md:grid-cols-2">
        <AdminCard
          title="تحديث الحالة"
          description="التأكيد يدوي بالكامل: فتح واتساب لا يؤكد الطلب. التغيير يظهر للعميل في صفحة تتبع الطلب."
        >
          <OrderStatusForm reference={order.reference} status={order.status} />
        </AdminCard>
        <AdminCard title="الملاحظات الداخلية">
          <OrderNotes orderId={order.id} notes={notes} />
        </AdminCard>
      </div>

      <AdminCard
        title="حذف الطلب"
        description="حذف نهائي لأصناف الطلب وملاحظاته وسجل حالته. لا يمكن التراجع."
        className="border-red-900/25"
      >
        <OrderDeleteButton reference={order.reference} redirectTo="/admin/orders" />
      </AdminCard>
    </div>
  );
}
