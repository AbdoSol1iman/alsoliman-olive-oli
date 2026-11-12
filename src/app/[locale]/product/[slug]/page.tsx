import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProductDetail } from "@/components/store/ProductDetail";
import { ProductCard } from "@/components/store/ProductCard";
import { findProductSlugByVariant, getCatalog } from "@/lib/catalog";
import { getSiteDictionary } from "@/lib/content";
import { buildListingItems, getProduct, type Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

// Reads searchParams (size) — a blocking, per-request route.
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { products } = await getCatalog();
  const product = getProduct(products, slug);
  if (!product || !product.active) return {};
  const isAr = locale !== "en";
  const name = isAr ? product.nameAr : product.nameEn;
  const variant = product.variants[0];
  const sizeLabel = variant ? (isAr ? variant.sizeLabelAr : variant.sizeLabelEn) : "";
  const title = sizeLabel ? `${name} — ${sizeLabel}` : name;
  const firstImage = product.images[0];
  // Uploaded media is stored as WebP, which Facebook/WhatsApp do not render in
  // link previews. `/api/og/...` serves the same image as JPEG for crawlers.
  const imageSrc = firstImage?.src ?? "/products/bottle-card.jpg";
  const ogImage =
    imageSrc.startsWith("/api/media/") && imageSrc.endsWith(".webp")
      ? imageSrc.replace("/api/media/", "/api/og/")
      : imageSrc;
  return {
    title,
    description: isAr ? product.hookAr : product.hookEn,
    alternates: {
      canonical: `/${locale}/product/${slug}`,
      languages: { ar: `/ar/product/${slug}`, en: `/en/product/${slug}` },
    },
    openGraph: {
      title,
      description: isAr ? product.hookAr : product.hookEn,
      images: [
        {
          url: ogImage,
          alt: firstImage ? (isAr ? firstImage.altAr : firstImage.altEn) : name,
        },
      ],
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ size?: string }>;
}) {
  // Resolve the legacy `?size=` redirect before rendering starts, so old
  // links and campaign URLs get a real 307 instead of a streamed meta refresh.
  const [{ locale, slug }, { size }] = await Promise.all([params, searchParams]);
  if (isLocale(locale) && size) {
    const owner = await findProductSlugByVariant(size);
    if (owner && owner !== slug) redirect(`/${locale}/product/${owner}`);
  }

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page py-16">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="aspect-[4/5] w-full bg-cream/40" />
        <div className="space-y-4">
          <div className="h-4 w-32 bg-cream/60" />
          <div className="h-10 w-3/4 bg-cream/60" />
          <div className="h-4 w-full bg-cream/40" />
          <div className="h-4 w-2/3 bg-cream/40" />
        </div>
      </div>
    </div>
  );
}

async function ProductBody({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ size?: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [{ products }, dict] = await Promise.all([getCatalog(), getSiteDictionary(locale)]);
  const product = getProduct(products, slug);
  if (!product || !product.active) notFound();
  const { size } = await searchParams;
  const isAr = locale === "ar";

  // Sizes of the same oil are separate products that share a family slug.
  const related = product.familySlug
    ? buildListingItems(products).filter(
        (item) =>
          item.product.id !== product.id && item.product.familySlug === product.familySlug,
      )
    : [];
  const jsonLd = !product.sample
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: isAr ? product.nameAr : product.nameEn,
        description: isAr ? product.hookAr : product.hookEn,
        image: [...new Set(product.images.map((i) => i.src))],
        brand: { "@type": "Brand", name: "Alsuliman" },
        offers: product.variants.map((v) => ({
          "@type": "Offer",
          sku: v.sku,
          image: product.images[0]?.src,
          priceCurrency: "EGP",
          price: v.price,
          availability:
            product.comingSoon || (v.stock !== null && v.stock <= 0)
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
        })),
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <section className="paper">
        <div className="container-page py-8 md:py-12">
          <nav aria-label="breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-[0.7rem] text-ink-muted">
            <Link href={`/${locale}`} className="hover:text-forest">{dict.product.breadcrumbHome}</Link>
            <span aria-hidden>/</span>
            <Link href={`/${locale}/shop`} className="hover:text-forest">{dict.product.breadcrumbShop}</Link>
            <span aria-hidden>/</span>
            <span className="text-forest">{isAr ? product.nameAr : product.nameEn}</span>
          </nav>

          <ProductDetail
            product={product}
            locale={locale}
            dict={dict}
            initialVariantId={size}
          />
        </div>
      </section>

      <section className="border-t border-gold/15 bg-cream/25 py-16 md:py-20">
        <div className="container-page grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-[1.4rem]">{dict.product.details}</h2>
            <div className="mt-4 space-y-4 text-[0.88rem] leading-8 text-ink-muted">
              {(isAr ? product.descriptionAr : product.descriptionEn).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            {product.specs.length > 0 ? (
              <>
                <h3 className="mt-8 text-[1.1rem] text-forest">{dict.product.specs}</h3>
                <dl className="mt-3 divide-y divide-gold/15 border-y border-gold/15">
                  {product.specs.map((spec) => (
                    <div key={spec.labelAr} className="flex justify-between gap-6 py-3 text-[0.82rem]">
                      <dt className="text-ink-muted">{isAr ? spec.labelAr : spec.labelEn}</dt>
                      <dd className="text-forest">{isAr ? spec.valueAr : spec.valueEn}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </div>

          <div className="space-y-8">
            <div className="border border-gold/20 bg-ivory p-6">
              <h3 className="text-[1.1rem] text-forest">{dict.product.storage}</h3>
              <p className="mt-2 text-[0.85rem] leading-7 text-ink-muted">
                {isAr ? product.storageAr : product.storageEn}
              </p>
            </div>
            <div className="border border-gold/20 bg-ivory p-6">
              <h3 className="text-[1.1rem] text-forest">{dict.product.shippingTitle}</h3>
              <p className="mt-2 text-[0.85rem] leading-7 text-ink-muted">{dict.product.shippingBody}</p>
              <Link
                href={`/${locale}/shipping`}
                className="mt-3 inline-block text-[0.78rem] text-forest underline decoration-gold/50 underline-offset-4"
              >
                {dict.product.tabsShipping}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="paper py-16 md:py-20">
          <div className="container-page">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="text-[clamp(1.5rem,3vw,2.2rem)]">{dict.product.related}</h2>
              <Link href={`/${locale}/shop`} className="text-[0.78rem] text-ink-muted hover:text-forest">
                {dict.featured.all}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-10">
              {related.map((item) => (
                <ProductCard key={item.key} item={item} locale={locale} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
