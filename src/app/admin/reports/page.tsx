import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { orderStats } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { connection } from "next/server";
import { AdminCard, EmptyState, Table, Td, Th } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const instant = false;

export const metadata = { title: "التقارير · Admin" };

const SeriesTable = ({
  points,
  emptyLabel,
}: {
  points: { label: string; date: string; orders: number; revenue: number }[];
  emptyLabel: string;
}) => {
  const rows = [...points].reverse();
  const hasData = rows.some((r) => r.orders > 0);
  if (!hasData) return <p className="py-4 text-center text-[0.78rem] text-ink-muted">{emptyLabel}</p>;
  return (
    <ul className="divide-y divide-gold/12">
      {rows.map((r) => (
        <li key={r.date} className="flex items-center justify-between gap-3 py-2.5 text-[0.8rem]">
          <span className="text-forest">{r.label}</span>
          <span className="flex items-center gap-4">
            <span className="tnum text-ink-muted">{r.orders} طلب</span>
            <span className="tnum w-24 text-end text-forest">{formatPrice(r.revenue)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

export default async function AdminReportsPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const stats = await orderStats();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">التقارير</h1>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            {stats.orders} طلب · إجمالي {formatPrice(stats.revenue)} · متوسط الطلب {formatPrice(stats.averageOrder)}
          </p>
        </div>
        <a
          href="/admin/orders/export"
          className="inline-flex h-11 items-center rounded-xs border border-forest/25 px-4 text-[0.78rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory"
        >
          ⬇ تصدير كل الطلبات CSV
        </a>
      </div>

      <AdminCard title="منحنى المبيعات" description="إيريد آخر 14 يومًا.">
        <RevenueChart points={stats.series.daily} />
      </AdminCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <AdminCard title="يومي — آخر 14 يومًا">
          <SeriesTable points={stats.series.daily} emptyLabel="لا مبيعات في آخر 14 يومًا." />
        </AdminCard>
        <AdminCard title="أسبوعي — آخر 8 أسابيع">
          <SeriesTable points={stats.series.weekly} emptyLabel="لا مبيعات في آخر 8 أسابيع." />
        </AdminCard>
        <AdminCard title="شهري — آخر 6 أشهر">
          <SeriesTable points={stats.series.monthly} emptyLabel="لا مبيعات في آخر 6 أشهر." />
        </AdminCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard title="الأكثر مبيعًا">
          {stats.bestSellers.length === 0 ? (
            <EmptyState title="لا توجد مبيعات بعد" />
          ) : (
            <ul className="divide-y divide-gold/12">
              {stats.bestSellers.map((b) => (
                <li key={`${b.productId}:${b.variantId}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[0.84rem] text-forest">{b.name}</p>
                    <p className="text-[0.7rem] text-ink-muted">{b.size}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="tnum text-[0.82rem] text-forest">{b.qty} وحدة</p>
                    <p className="tnum text-[0.7rem] text-ink-muted">{formatPrice(b.revenue)}</p>
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
            <Table className="border-0">
              <thead>
                <tr>
                  <Th>المنتج</Th>
                  <Th>الحجم</Th>
                  <Th>SKU</Th>
                  <Th>المتبقي</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/12 bg-ivory">
                {stats.lowStock.map((l, i) => (
                  <tr key={i}>
                    <Td>{l.product}</Td>
                    <Td>{l.variant}</Td>
                    <Td className="font-mono text-[0.7rem]">
                      <span dir="ltr">{l.sku || "—"}</span>
                    </Td>
                    <Td>
                      <span
                        className={
                          l.stock === 0
                            ? "tnum rounded-full bg-red-100/60 px-2.5 py-0.5 text-[0.7rem] text-red-900"
                            : "tnum rounded-full bg-gold/20 px-2.5 py-0.5 text-[0.7rem] text-forest"
                        }
                      >
                        {l.stock === 0 ? "نفد" : `${l.stock} / ${l.threshold}`}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
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
  );
}
