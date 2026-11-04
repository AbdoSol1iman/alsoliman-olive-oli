import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { orderStats } from "@/lib/orders";
import { formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { AdminCard, EmptyState, StatusBadge, Table, Td, Th } from "@/components/admin/ui";

export const instant = false;

const stat = (label: string, value: string, hint?: string) => ({ label, value, hint });

export default async function AdminHome() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const stats = await orderStats();

  const cards = [
    stat("إجمالي المبيعات", formatPrice(stats.revenue), "من كل الطلبات غير الملغاة"),
    stat("متوسط الطلب", formatPrice(stats.averageOrder)),
    stat("الطلبات", String(stats.orders), `${stats.pending} بانتظار التأكيد`),
    stat("قيد التجهيز", String(stats.processing), "مؤكدة أو قيد التجهيز"),
    stat("تم التوصيل", String(stats.delivered), `${stats.cancelled} ملغاة`),
    stat("منتجات نشطة", String(stats.products)),
  ];

  const quickActions = [
    { href: "/admin/products/new", label: "إضافة منتج" },
    { href: "/admin/orders?status=pending", label: "الطلبات المعلقة" },
    { href: "/admin/media", label: "رفع صورة" },
    { href: "/admin/settings", label: "الإعدادات" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">نظرة عامة</h1>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            ملخص المتجر — الطلبات، المبيعات والمخزون من قاعدة البيانات مباشرة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.76rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="border border-gold/20 bg-ivory p-4">
            <p className="text-[0.63rem] tracking-[0.16em] text-gold">{c.label}</p>
            <p className="tnum mt-2 text-[1.45rem] leading-none text-forest">{c.value}</p>
            {c.hint ? <p className="mt-1.5 text-[0.68rem] text-ink-muted">{c.hint}</p> : null}
          </div>
        ))}
      </div>

      <AdminCard
        title="المبيعات اليومية"
        description="إيريد آخر 14 يومًا — مرر فوق الأعمدة للتفاصيل."
        action={
          <Link href="/admin/reports" className="text-[0.75rem] text-ink-muted hover:text-forest">
            كل التقارير ←
          </Link>
        }
      >
        <RevenueChart points={stats.series.daily} />
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AdminCard
          title="أحدث الطلبات"
          action={
            <Link href="/admin/orders" className="text-[0.75rem] text-ink-muted hover:text-forest">
              كل الطلبات ←
            </Link>
          }
          bodyClassName="p-0"
        >
          {stats.recentOrders.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="لا توجد طلبات بعد"
                body="أول طلب يتم من المتجر يظهر هنا مباشرة."
              />
            </div>
          ) : (
            <Table className="border-0">
              <thead>
                <tr>
                  <Th>رقم الطلب</Th>
                  <Th>العميل</Th>
                  <Th>الإجمالي</Th>
                  <Th>الحالة</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/12 bg-ivory">
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-cream/30">
                    <Td>
                      <Link
                        href={`/admin/orders/${o.reference}`}
                        className="text-forest underline decoration-gold/40 underline-offset-4"
                        dir="ltr"
                      >
                        {o.reference}
                      </Link>
                      <p className="text-[0.68rem] text-ink-muted">{formatDate(o.created_at)}</p>
                    </Td>
                    <Td>{o.customer_name}</Td>
                    <Td className="tnum text-forest">{formatPrice(o.total)}</Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title="الأكثر مبيعًا" bodyClassName="p-0">
            {stats.bestSellers.length === 0 ? (
              <div className="p-5">
                <EmptyState title="لا توجد مبيعات بعد" />
              </div>
            ) : (
              <ul className="divide-y divide-gold/12">
                {stats.bestSellers.map((b) => (
                  <li key={`${b.productId}:${b.variantId}`} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.82rem] text-forest">{b.name}</p>
                      <p className="text-[0.68rem] text-ink-muted">{b.size}</p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="tnum text-[0.82rem] text-forest">{b.qty} وحدة</p>
                      <p className="tnum text-[0.68rem] text-ink-muted">{formatPrice(b.revenue)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title="تنبيهات المخزون" description="أصناف وصلت لحد التنبيه أو أقل.">
            {stats.lowStock.length === 0 ? (
              <p className="text-[0.8rem] text-ink-muted">كل الأصناف بمخزون آمن 👌</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.lowStock.slice(0, 8).map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-[0.78rem]">
                    <span className="min-w-0 truncate text-forest">
                      {l.product} — {l.variant}
                    </span>
                    <span
                      className={
                        l.stock === 0
                          ? "tnum shrink-0 rounded-full bg-red-100/60 px-2.5 py-0.5 text-[0.68rem] text-red-900"
                          : "tnum shrink-0 rounded-full bg-gold/20 px-2.5 py-0.5 text-[0.68rem] text-forest"
                      }
                    >
                      {l.stock === 0 ? "نفد" : `${l.stock} وحدة`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/products"
              className="mt-4 inline-block text-[0.74rem] text-ink-muted hover:text-forest"
            >
              إدارة المنتجات ←
            </Link>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
