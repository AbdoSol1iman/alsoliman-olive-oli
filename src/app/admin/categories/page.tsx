import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listCategoriesAdmin } from "@/lib/catalog";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const instant = false;

export const metadata = { title: "التصنيفات · Admin" };

export default async function AdminCategoriesPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const categories = await listCategoriesAdmin();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">التصنيفات</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          {categories.length} تصنيف مرتبط بمنتجات المتجر.
        </p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
