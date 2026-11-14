import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrderByReference } from "@/lib/orders";
import { getSettingsAdmin } from "@/lib/settings";
import { formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";
import { PrintButton } from "@/components/admin/PrintButton";
import { STATUS_LABELS } from "@/lib/order-status";

export const instant = false;

export const metadata = { title: "فاتورة · Admin" };

/** Printable invoice — opens in a new tab, hides chrome via print CSS. */
export default async function AdminInvoicePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const { reference } = await params;
  const [result, settings] = await Promise.all([
    getOrderByReference(reference),
    getSettingsAdmin(),
  ]);
  if (!result) notFound();
  const { order, items } = result;
  const zone = settings.shipping.zones[order.governorate];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/orders/${order.reference}`} className="text-[0.78rem] text-ink-muted hover:text-forest">
          ← رجوع للطلب
        </Link>
        <PrintButton />
      </div>

      <div className="border border-gold/25 bg-ivory p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gold/25 pb-5">
          <div>
            <p className="font-display text-[1.4rem] text-forest">{settings.store.nameAr}</p>
            <p className="text-[0.75rem] text-ink-muted" dir="ltr">
              {settings.store.nameEn}
            </p>
            <p className="mt-2 max-w-xs text-[0.72rem] leading-6 text-ink-muted">{settings.contact.addressAr}</p>
            <p className="tnum text-[0.72rem] text-ink-muted" dir="ltr">
              {settings.contact.phoneDisplay}
            </p>
          </div>
          <div className="text-end">
            <p className="text-[0.66rem] tracking-[0.2em] text-gold">فاتورة</p>
            <p className="mt-1 text-[1.05rem] text-forest" dir="ltr">
              {order.reference}
            </p>
            <p className="mt-1 text-[0.75rem] text-ink-muted">{formatDate(order.created_at)}</p>
          </div>
        </header>

        <div className="grid gap-5 border-b border-gold/20 py-5 sm:grid-cols-2">
          <div>
            <p className="text-[0.66rem] tracking-[0.18em] text-gold">العميل</p>
            <p className="mt-2 text-[0.88rem] text-forest">{order.customer_name}</p>
            <p className="tnum text-[0.78rem] text-ink-muted" dir="ltr">
              {order.phone}
              {order.phone2 ? ` · ${order.phone2}` : ""}
            </p>
            <p className="mt-1 text-[0.78rem] leading-6 text-ink-muted">
              {order.address}، {order.city}، {zone?.ar ?? order.governorate}
            </p>
          </div>
          <div className="sm:text-end">
            <p className="text-[0.66rem] tracking-[0.18em] text-gold">طريقة الدفع</p>
            <p className="mt-2 text-[0.85rem] text-forest">
              {order.payment_method === "cod" ? "الدفع عند الاستلام" : "إنستاباي"}
            </p>
            <p className="mt-1 text-[0.75rem] text-ink-muted">
              الحالة: {STATUS_LABELS[order.status]}
            </p>
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-[0.82rem]">
          <thead>
            <tr className="border-b border-forest/30 text-start text-forest">
              <th className="py-2 text-start font-medium">الصنف</th>
              <th className="py-2 text-start font-medium">السعر</th>
              <th className="py-2 text-center font-medium">الكمية</th>
              <th className="py-2 text-end font-medium">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gold/15">
                <td className="py-2.5 text-forest">
                  {item.name_ar}
                  <span className="ms-2 text-[0.7rem] text-ink-muted">{item.size_ar}</span>
                </td>
                <td className="tnum py-2.5 text-ink-muted">{formatPrice(item.unit_price)}</td>
                <td className="tnum py-2.5 text-center text-ink-muted">{item.qty}</td>
                <td className="tnum py-2.5 text-end text-forest">{formatPrice(item.unit_price * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 ms-auto max-w-xs space-y-1.5 text-[0.84rem]">
          <div className="flex justify-between">
            <span className="text-ink-muted">المجموع الفرعي</span>
            <span className="tnum text-forest">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">الشحن</span>
            <span className="tnum text-forest">
              {order.shipping === 0 ? "مجاني" : formatPrice(order.shipping)}
            </span>
          </div>
          <div className="flex justify-between border-t border-forest/30 pt-2 text-[0.95rem]">
            <span className="text-forest">الإجمالي المستحق</span>
            <span className="tnum font-medium text-forest">{formatPrice(order.total)}</span>
          </div>
        </div>

        <footer className="mt-8 border-t border-gold/20 pt-4 text-center text-[0.7rem] leading-6 text-ink-muted print:text-ink-muted">
          شكرًا لثقتك بـ {settings.store.nameAr} — {settings.contact.phoneDisplay}
        </footer>
      </div>
    </div>
  );
}
