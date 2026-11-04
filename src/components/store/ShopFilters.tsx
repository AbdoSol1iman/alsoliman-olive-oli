"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "@/components/ui/Icons";
import { cx } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

const sizeName = (ml: number, locale: Locale) =>
  ml >= 1000 ? (locale === "ar" ? "١ لتر" : "1 L") : locale === "ar" ? `${ml} مل` : `${ml} ml`;

export function ShopFilters({
  locale,
  dict,
  resultCount,
  sizes,
}: {
  locale: Locale;
  dict: Dictionary;
  resultCount: number;
  /** Distinct variant sizes in the catalog (from the server). */
  sizes: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeSize = searchParams.get("size") ? Number(searchParams.get("size")) : null;
  const activeSort = searchParams.get("sort") ?? "relevance";
  const urlQuery = searchParams.get("q") ?? "";

  // Keep the input in sync with the URL (back/forward, size chips that drop
  // the query). Adjusting state during render avoids a cascading effect.
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (!v) next.delete(k);
      else next.set(k, v);
    });
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <div className="border-y border-gold/20 bg-ivory/60">
      <div className="container-page flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            push({ q: query.trim() || null });
          }}
          className="flex h-11 w-full items-center gap-2 border-b border-forest/20 px-1 transition-colors focus-within:border-gold lg:max-w-xs"
          role="search"
        >
          <Search size={17} className="text-gold" />
          <label htmlFor="shop-search" className="sr-only">
            {dict.shop.search}
          </label>
          <input
            id="shop-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.shop.search}
            className="h-full w-full bg-transparent text-[0.85rem] outline-none placeholder:text-ink-muted/60"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                push({ q: null });
              }}
              className="text-[0.65rem] text-ink-muted hover:text-forest"
            >
              {dict.shop.clear}
            </button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="me-1 text-[0.68rem] tracking-[0.16em] text-ink-muted">{dict.shop.size}</span>
          <button
            type="button"
            onClick={() => push({ size: null })}
            aria-pressed={!activeSize}
            className={cx(
              "h-9 rounded-full border px-4 text-[0.75rem] transition-colors",
              !activeSize
                ? "border-forest bg-forest text-ivory"
                : "border-forest/20 text-forest hover:border-forest/50",
            )}
          >
            {dict.shop.allSizes}
          </button>
          {sizes.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => push({ size: String(ml) })}
              aria-pressed={activeSize === ml}
              className={cx(
                "h-9 rounded-full border px-4 text-[0.75rem] transition-colors",
                activeSize === ml
                  ? "border-forest bg-forest text-ivory"
                  : "border-forest/20 text-forest hover:border-forest/50",
              )}
            >
              {sizeName(ml, locale)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <span className="tnum hidden text-[0.72rem] text-ink-muted sm:inline">
            {resultCount} {dict.shop.results}
          </span>
          <label htmlFor="shop-sort" className="sr-only">
            {dict.shop.sort}
          </label>
          <select
            id="shop-sort"
            value={activeSort}
            onChange={(e) => push({ sort: e.target.value === "relevance" ? null : e.target.value })}
            className="h-10 border border-forest/20 bg-ivory px-3 text-[0.78rem] text-forest outline-none transition-colors focus:border-gold"
          >
            <option value="relevance">{dict.shop.sortRelevance}</option>
            <option value="price-asc">{dict.shop.sortPriceAsc}</option>
            <option value="price-desc">{dict.shop.sortPriceDesc}</option>
          </select>
        </div>
      </div>
      {isPending ? (
        <div className="h-px w-full overflow-hidden bg-gold/20">
          <div className="h-px w-1/3 animate-[slm-shimmer_1.2s_ease-in-out_infinite] bg-gold" />
        </div>
      ) : null}
    </div>
  );
}
