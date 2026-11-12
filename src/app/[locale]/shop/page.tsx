import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { ShopFilters } from "@/components/store/ShopFilters";
import { ButtonLink } from "@/components/ui/Button";
import { OliveBranch } from "@/components/brand/Logo";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getSiteDictionary } from "@/lib/content";
import { buildOpenGraph } from "@/lib/metadata";
import { buildListingItems, buildSizeFilters, type Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale !== "en";
  const title = isAr ? "متجر المنتجات" : "Shop";
  const description = isAr
    ? "اختر حجم زيت الزيتون البكر الممتاز المناسب لمائدتك — ٥٠٠ مل، ٧٥٠ مل، و١ لتر."
    : "Choose the extra virgin olive oil size for your table — 500 ml, 750 ml and 1 L.";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/shop`, languages: { ar: "/ar/shop", en: "/en/shop" } },
    openGraph: await buildOpenGraph({
      locale: isAr ? "ar" : "en",
      path: `/${isAr ? "ar" : "en"}/shop`,
      title,
      description,
    }),
  };
}

type Search = { q?: string; size?: string; sort?: string };

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, { products }, settings] = await Promise.all([
    getSiteDictionary(locale),
    getCatalog(),
    getSettings(),
  ]);
  const items = buildListingItems(products);
  const sizes = buildSizeFilters(products);

  return (
    <>
      <section className="relative overflow-hidden border-b border-gold/15 bg-cream/30">
        <OliveBranch
          className="pointer-events-none absolute -end-16 -top-10 h-[300px] w-auto opacity-[0.12]"
          tone="#7C8A57"
        />
        <div className="container-page relative py-10 md:py-14">
          <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-2 text-[0.7rem] text-ink-muted">
            <a href={`/${locale}`} className="hover:text-forest">{dict.product.breadcrumbHome}</a>
            <span aria-hidden>/</span>
            <span className="text-forest">{dict.shop.title}</span>
          </nav>
          <p className="eyebrow">{dict.shop.eyebrow}</p>
          <h1 className="mt-4 text-[clamp(2.1rem,5vw,3.6rem)]">{dict.shop.title}</h1>
          <p className="mt-4 max-w-xl text-[0.92rem] leading-8 text-ink-muted">{dict.shop.body}</p>
          {settings.flags.sampleCatalog ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-xs border border-gold/30 bg-ivory/70 px-3 py-1.5 text-[0.68rem] text-gold">
              <span aria-hidden className="size-1 rounded-full bg-gold" />
              {dict.shop.sampleNotice}
            </p>
          ) : null}
        </div>
      </section>

      <Suspense fallback={<div className="h-24" />}>
        <ShopResults locale={locale} dict={dict} items={items} sizes={sizes} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ShopResults({
  locale,
  dict,
  items,
  sizes,
  searchParams,
}: {
  locale: Locale;
  dict: Awaited<ReturnType<typeof getSiteDictionary>>;
  items: ReturnType<typeof buildListingItems>;
  sizes: number[];
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const size = sp.size ? Number(sp.size) : null;
  const sort = sp.sort ?? "relevance";

  let filtered = items.filter((item) => {
    const name = `${item.product.nameAr} ${item.product.nameEn} ${item.variant.sizeLabelAr} ${item.variant.sizeLabelEn}`.toLowerCase();
    const matchesQuery = !q || name.includes(q);
    const matchesSize = !size || item.variant.ml === size;
    return matchesQuery && matchesSize;
  });

  if (sort === "price-asc") filtered = [...filtered].sort((a, b) => a.variant.price - b.variant.price);
  if (sort === "price-desc") filtered = [...filtered].sort((a, b) => b.variant.price - a.variant.price);

  return (
    <>
      <ShopFilters locale={locale} dict={dict} resultCount={filtered.length} sizes={sizes} />

      <section className="paper py-14 md:py-20">
        <div className="container-page">
          {filtered.length === 0 ? (
            <div className="mx-auto max-w-md border border-gold/25 bg-ivory px-8 py-14 text-center">
              <p className="font-display text-2xl text-forest">{dict.shop.noResults}</p>
              <p className="mt-3 text-[0.85rem] text-ink-muted">{dict.shop.noResultsBody}</p>
              <ButtonLink href={`/${locale}/shop`} variant="outline" size="sm" className="mt-6">
                {dict.shop.clear}
              </ButtonLink>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-10">
              {filtered.map((item, i) => (
                <ProductCard
                  key={item.key}
                  item={item}
                  locale={locale}
                  dict={dict}
                  priority={i < 2}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
