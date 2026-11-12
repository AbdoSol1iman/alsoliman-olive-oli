import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { readCatalogData } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { connection } from "next/server";
import { ProductFlags, ProductRowActions } from "@/components/admin/ProductListActions";
import { EmptyState, Table, Td, Th } from "@/components/admin/ui";

export const instant = false;

export default async function AdminProductsPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  // One catalog read — this page used to fetch the full catalog twice.
  const { products, categories } = await readCatalogData();
  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.nameAr ?? "—") : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] text-forest">المنتجات</h1>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            {products.length} منتج في الكتالوج. استخدم الأسهم في عمود «الترتيب» لتغيير ترتيب
            المنتجات، وأسهم الأحجام داخل صفحة التعديل لتغيير ترتيب الأحجام. كل تعديل يظهر فورًا.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-11 items-center rounded-xs bg-forest px-5 text-[0.82rem] text-ivory transition-colors hover:bg-forest-deep"
        >
          + إضافة منتج
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات بعد"
          body="أضف أول منتج ليظهر في المتجر — الاسم، الأسعار، الأحجام والصور."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>المنتج</Th>
              <Th>التصنيف</Th>
              <Th>الأحجام والأسعار</Th>
              <Th>المخزون</Th>
              <Th>الظهور</Th>
              <Th>الترتيب</Th>
              <Th>إجراءات</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {products.map((p, index) => {
              const totalStock = p.variants.reduce(
                (s, v) => s + (v.stock ?? 0),
                0,
              );
              const tracked = p.variants.some((v) => v.stock !== null);
              return (
                <tr key={p.id} className="align-top hover:bg-cream/30">
                  <Td className="min-w-52">
                    <div className="flex gap-3">
                      <span className="relative block size-14 shrink-0 overflow-hidden bg-cream/60">
                        <Image
                          src={p.images[0]?.src ?? "/products/bottle-cutout.png"}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[0.85rem] text-forest">
                          {p.nameAr}
                          {p.comingSoon ? (
                            <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[0.62rem] text-forest">
                              قريبًا
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[0.68rem] text-ink-muted" dir="ltr">
                          /{p.slug}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] text-ink-muted">{p.nameEn}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{categoryName(p.categoryId)}</Td>
                  <Td>
                    <ul className="space-y-1">
                      {p.variants.map((v) => (
                        <li key={v.id} className="flex items-center gap-2 text-[0.74rem]">
                          <span className="text-ink-muted">{v.sizeLabelAr}</span>
                          <span className="tnum text-forest">{formatPrice(v.price)}</span>
                          {v.compareAt ? (
                            <span className="tnum text-[0.66rem] text-ink-muted line-through">
                              {formatPrice(v.compareAt)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Td>
                  <Td>
                    {tracked ? (
                      <span
                        className={
                          totalStock <= p.lowStockThreshold
                            ? "tnum rounded-full bg-gold/20 px-2.5 py-1 text-[0.7rem] text-forest"
                            : "tnum rounded-full bg-sage/20 px-2.5 py-1 text-[0.7rem] text-forest"
                        }
                      >
                        {totalStock} وحدة
                      </span>
                    ) : (
                      <span className="text-[0.7rem] text-ink-muted">غير متتبع</span>
                    )}
                  </Td>
                  <Td>
                    <ProductFlags
                      id={p.id}
                      active={p.active}
                      featured={p.featured}
                      comingSoon={p.comingSoon}
                    />
                  </Td>
                  <Td className="tnum">{p.sortOrder}</Td>
                  <Td>
                    <div className="space-y-2">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="inline-flex h-8 items-center rounded-xs border border-forest/20 px-2.5 text-[0.72rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory"
                      >
                        تعديل
                      </Link>
                      <ProductRowActions
                        id={p.id}
                        name={p.nameAr}
                        canUp={index > 0}
                        canDown={index < products.length - 1}
                      />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
