import { requireAdmin } from "@/lib/auth";
import { products } from "@/lib/products";
import { flags } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import { connection } from "next/server";

export const instant = false;

export default async function AdminProductsPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const variants = products.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );

  return (
    <div>
      <h1 className="text-[1.7rem]">المنتجات</h1>
      <p className="mt-1 text-[0.82rem] leading-7 text-ink-muted">
        الكتالوج الحالي كما يظهر في المتجر. تعديل المحتوى والأسعار يتم من ملف الكتالوج
        {" "}<code className="rounded-xs bg-cream px-1.5 py-0.5 text-[0.75rem]" dir="ltr">src/lib/products.ts</code>{" "}
        حتى يتم ربط لوحة إدارة منتجات كاملة.
      </p>

      {flags.sampleCatalog ? (
        <p className="mt-4 inline-flex items-center gap-2 border border-gold/30 bg-cream/40 px-3 py-2 text-[0.72rem] text-gold">
          <span aria-hidden className="size-1.5 rounded-full bg-gold" />
          الأسعار والمخزون الحالية بيانات تجريبية بانتظار تأكيد المالك.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto border border-gold/20">
        <table className="w-full min-w-[720px] border-collapse text-[0.82rem]">
          <thead className="bg-forest text-ivory">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">المنتج</th>
              <th className="px-4 py-2.5 text-start font-medium">SKU</th>
              <th className="px-4 py-2.5 text-start font-medium">الحجم</th>
              <th className="px-4 py-2.5 text-start font-medium">السعر</th>
              <th className="px-4 py-2.5 text-start font-medium">المخزون</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {variants.map(({ product, variant }) => (
              <tr key={variant.id}>
                <td className="px-4 py-3 text-forest">{product.nameAr}</td>
                <td className="px-4 py-3 text-[0.72rem] text-ink-muted" dir="ltr">{variant.sku}</td>
                <td className="px-4 py-3 text-ink-muted">{variant.sizeLabelAr}</td>
                <td className="tnum px-4 py-3 text-forest">{formatPrice(variant.price)}</td>
                <td className="tnum px-4 py-3">
                  <span
                    className={
                      variant.stock !== null && variant.stock <= 5
                        ? "rounded-full bg-gold/20 px-2.5 py-1 text-[0.7rem] text-forest"
                        : "rounded-full bg-sage/20 px-2.5 py-1 text-[0.7rem] text-forest"
                    }
                  >
                    {variant.stock === null ? "غير متتبع" : `${variant.stock} وحدة`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[0.72rem] leading-6 text-ink-muted">
        ملاحظة: تعديل الأسعار والمخزون يحتاج خطوة لاحقة لنقل الكتالوج إلى قاعدة البيانات.
        الطلبات تُحفظ فعليًا في قاعدة البيانات الآن.
      </p>
    </div>
  );
}
