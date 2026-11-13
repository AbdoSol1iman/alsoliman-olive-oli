"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Bag, Close, Menu, Search } from "@/components/ui/Icons";
import { useCartCount, useCartStore } from "@/lib/cart-store";
import { useHydrated } from "@/lib/use-hydrated";
import { cx } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { nav } from "@/lib/config";
import type { Locale } from "@/lib/products";

const navKeys: Record<string, keyof Dictionary["nav"]> = {
  "": "home",
  shop: "shop",
  olive: "olive",
  story: "story",
  contact: "contact",
};

function CartButton({
  dict,
  onClick,
}: {
  dict: Dictionary;
  onClick: () => void;
}) {
  const count = useCartCount();
  const mounted = useHydrated();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${dict.common.cart}${mounted && count > 0 ? ` (${count})` : ""}`}
      className="relative grid size-10 place-items-center rounded-full text-forest transition-colors hover:bg-cream/70"
    >
      <Bag size={20} />
      {mounted && count > 0 ? (
        <span className="tnum absolute -top-0.5 -end-0.5 grid min-w-[18px] place-items-center rounded-full bg-forest px-1 text-[0.6rem] font-semibold leading-[18px] text-ivory">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function Header({
  locale,
  dict,
  logoSrc,
}: {
  locale: Locale;
  dict: Dictionary;
  logoSrc?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const openCart = useCartStore((s) => s.open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close overlays when the route changes (React's "adjust state during
  // render" pattern — avoids a setState-inside-effect cascading render).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      document.documentElement.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    });
    return () => {
      cancelAnimationFrame(frameId);
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  const rest = pathname.split("/").slice(2).join("/");
  const otherLocale: Locale = locale === "ar" ? "en" : "ar";
  const switchHref = `/${otherLocale}${rest ? `/${rest}` : ""}`;
  const isActive = (href: string) =>
    href === "/" ? rest === "" : rest.startsWith(href.replace("/", ""));

  return (
    <>
      <header
        className={cx(
          "sticky top-0 z-40 border-b bg-ivory/85 backdrop-blur-xl transition-[padding,border-color,background-color] duration-500",
          scrolled ? "border-gold/25 shadow-[0_1px_0_rgba(183,154,85,0.08)]" : "border-transparent",
        )}
      >
        <div
          className={cx(
            "container-page flex items-center justify-between gap-4 transition-[height] duration-500",
            scrolled ? "h-[68px]" : "h-[84px]",
          )}
        >
          <Link
            href={`/${locale}`}
            aria-label={locale === "ar" ? "آل سليمان — الرئيسية" : "Alsuliman — home"}
            className="shrink-0"
          >
            <Logo locale={locale} src={logoSrc} />
          </Link>

          <nav aria-label={dict.common.menu} className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => {
              const key = navKeys[item.href === "/" ? "" : item.href.slice(1)];
              const href = `/${locale}${item.href === "/" ? "" : item.href}`;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cx(
                    "link-underline text-[0.86rem] tracking-wide transition-colors",
                    isActive(item.href) ? "text-forest" : "text-ink-muted hover:text-forest",
                  )}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {dict.nav[key]}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={dict.common.search}
              className="grid size-10 place-items-center rounded-full text-forest transition-colors hover:bg-cream/70"
            >
              <Search size={19} />
            </button>

            <Link
              href={switchHref}
              className="hidden h-10 items-center rounded-full px-3 text-[0.72rem] tracking-[0.18em] text-ink-muted transition-colors hover:text-forest sm:inline-flex"
              aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
              hrefLang={otherLocale}
            >
              {dict.common.language}
            </Link>

            <CartButton dict={dict} onClick={openCart} />

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={dict.common.menu}
              className="grid size-10 place-items-center rounded-full text-forest transition-colors hover:bg-cream/70 lg:hidden"
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>

      {/* search overlay */}
      <div
        className={cx(
          "fixed inset-0 z-50 transition-opacity duration-300",
          searchOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!searchOpen}
      >
        <button
          type="button"
          aria-label={dict.common.close}
          onClick={() => setSearchOpen(false)}
          className="absolute inset-0 bg-forest-deep/40 backdrop-blur-sm"
          tabIndex={searchOpen ? 0 : -1}
        />
        <div
          className={cx(
            "relative mx-auto mt-0 w-full max-w-3xl bg-ivory p-6 shadow-lift transition-transform duration-500 ease-[var(--ease-out-soft)] md:mt-24 md:rounded-xs",
            searchOpen ? "translate-y-0" : "-translate-y-6",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={dict.common.search}
        >
          <form
            action={`/${locale}/shop`}
            onSubmit={() => setSearchOpen(false)}
            className="flex items-center gap-3 border-b border-forest/15 pb-3"
          >
            <Search size={20} className="text-gold" />
            <input
              name="q"
              autoFocus={searchOpen}
              placeholder={dict.shop.search}
              aria-label={dict.shop.search}
              className="h-11 w-full bg-transparent text-lg outline-none placeholder:text-ink-muted/70"
              tabIndex={searchOpen ? 0 : -1}
            />
            <button
              type="submit"
              className="hidden rounded-xs bg-forest px-5 py-2 text-[0.8rem] text-ivory sm:block"
              tabIndex={searchOpen ? 0 : -1}
            >
              {dict.common.search}
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label={dict.common.close}
              className="grid size-9 place-items-center text-ink-muted hover:text-forest"
              tabIndex={searchOpen ? 0 : -1}
            >
              <Close size={18} />
            </button>
          </form>
          <p className="mt-4 text-[0.75rem] text-ink-muted">{dict.shop.body}</p>
        </div>
      </div>

      {/* mobile menu */}
      <div
        className={cx(
          "fixed inset-0 z-50 lg:hidden",
          menuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          aria-label={dict.common.close}
          onClick={() => setMenuOpen(false)}
          className={cx(
            "absolute inset-0 bg-forest-deep/45 backdrop-blur-sm transition-opacity duration-400",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
          tabIndex={menuOpen ? 0 : -1}
        />
        <div
          className={cx(
            "absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col bg-ivory shadow-lift transition-transform duration-500 ease-[var(--ease-out-soft)]",
            menuOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={dict.common.menu}
        >
          <div className="flex items-center justify-between border-b border-gold/20 px-6 py-5">
            <Logo locale={locale} src={logoSrc} />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={dict.common.close}
              className="grid size-9 place-items-center rounded-full text-forest hover:bg-cream"
              tabIndex={menuOpen ? 0 : -1}
            >
              <Close size={20} />
            </button>
          </div>

          <nav className="flex flex-col px-2 py-4" aria-label={dict.common.menu}>
            {nav.map((item) => {
              const key = navKeys[item.href === "/" ? "" : item.href.slice(1)];
              return (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href === "/" ? "" : item.href}`}
                  onClick={() => setMenuOpen(false)}
                  className={cx(
                    "flex items-center justify-between rounded-xs px-4 py-4 font-display text-[1.35rem] transition-colors",
                    isActive(item.href) ? "text-forest" : "text-forest/70 hover:text-forest",
                  )}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  {dict.nav[key]}
                  <span className="text-gold/70">·</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-gold/20 px-6 py-5">
            <div className="flex items-center justify-between">
              <Link
                href={switchHref}
                onClick={() => setMenuOpen(false)}
                className="text-[0.8rem] tracking-[0.16em] text-ink-muted"
                tabIndex={menuOpen ? 0 : -1}
              >
                {dict.common.language}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/${locale}/shop`);
                }}
                className="text-[0.8rem] text-gold"
                tabIndex={menuOpen ? 0 : -1}
              >
                {dict.featured.all}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
