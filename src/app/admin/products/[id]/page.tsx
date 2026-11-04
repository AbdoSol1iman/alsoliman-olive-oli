import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProductForEdit, listCategoriesAdmin } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { connection } from "next/server";

export const instant = false;

export const metadata = { title: "تعديل منتج" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireAdmin();
  const { id } = await params;
  const product = getProductForEdit(id);
  if (!product) notFound();
  const categories = listCategoriesAdmin();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.7rem] text-forest">تعديل: {product.nameAr}</h1>
          <p className="mt-1 text-[0.82rem] text-ink-muted" dir="ltr">
            /{product.slug}
          </p>
        </div>
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className="text-[0.78rem] text-ink-muted underline decoration-gold/50 underline-offset-4 hover:text-forest"
        >
          معاينة في المتجر ↗
        </Link>
      </div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
