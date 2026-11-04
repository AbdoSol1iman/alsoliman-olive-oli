import { requireAdmin } from "@/lib/auth";
import { listCategoriesAdmin } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { connection } from "next/server";

export const instant = false;

export const metadata = { title: "إضافة منتج" };

export default async function NewProductPage() {
  await connection();
  await requireAdmin();
  const categories = await listCategoriesAdmin();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">إضافة منتج</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          المنتج الجديد يظهر في المتجر فور الحفظ — لا حاجة لإعادة النشر.
        </p>
      </div>
      <ProductForm product={null} categories={categories} />
    </div>
  );
}
