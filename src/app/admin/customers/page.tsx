import { requireAdmin } from "@/lib/auth";
import { listCustomers } from "@/lib/orders";
import { formatDate, formatPrice } from "@/lib/format";
import { connection } from "next/server";
import { EmptyState, Table, Td, Th } from "@/components/admin/ui";

export const instant = false;

export const metadata = { title: "العملاء · Admin" };

export default async function AdminCustomersPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const customers = await listCustomers();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">العملاء</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          {customers.length} عميل من الطلبات المسجلة — الاسم، الهاتف، عدد الطلبات وإجمالي المشتريات.
        </p>
      </div>

      {customers.length === 0 ? (
        <EmptyState title="لا يوجد عملاء بعد" body="عملاؤك يظهرون هنا تلقائيًا أول ما يسجلوا طلبًا." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>العميل</Th>
              <Th>الهاتف</Th>
              <Th>المحافظة</Th>
              <Th>عدد الطلبات</Th>
              <Th>إجمالي المشتريات</Th>
              <Th>آخر طلب</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {customers.map((c) => (
              <tr key={c.phone} className="hover:bg-cream/30">
                <Td className="text-forest">{c.name}</Td>
                <Td className="tnum">
                  <span dir="ltr">{c.phone}</span>
                </Td>
                <Td>
                  {c.governorate}
                  {c.city ? ` — ${c.city}` : ""}
                </Td>
                <Td className="tnum">{c.orders}</Td>
                <Td className="tnum text-forest">{formatPrice(c.totalSpent)}</Td>
                <Td className="text-[0.72rem]">{formatDate(c.lastOrderAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
