import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "../globals.css";
import { BrandMark } from "@/components/brand/Logo";
import { logoutAction } from "@/app/actions/admin";
import { getSession } from "@/lib/auth";
import { fontVariables } from "@/lib/fonts";
import { connection } from "next/server";

/** Admin is a standalone, Arabic-only area — outside the storefront locale tree. */
export const instant = false;

export const viewport: Viewport = {
  themeColor: "#26311f",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "لوحة التحكم | آل سليمان", template: "%s | لوحة التحكم — آل سليمان" },
  robots: { index: false, follow: false },
};

const navLinks = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/products", label: "المنتجات" },
];

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Admin is per-request by definition (session cookie). Signalling that
  // explicitly keeps Next from trying to prerender the session check — which
  // reads an unstable `Date.now()` inside token expiry validation.
  await connection();
  const session = await getSession();

  return (
    <html lang="ar" dir="rtl" className={fontVariables} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="flex min-h-svh flex-col bg-ivory text-charcoal">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[60] focus:rounded-xs focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory"
        >
          تخطَّ إلى المحتوى
        </a>

        <header className="border-b border-gold/20 bg-forest-deep text-ivory">
          <div className="container-page flex h-16 items-center justify-between gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <BrandMark size={26} />
              <div className="leading-tight">
                <p className="font-display text-[1.1rem] text-gold-pale">آل سليمان</p>
                <p className="text-[0.6rem] tracking-[0.2em] text-sage/70">ADMIN</p>
              </div>
            </Link>

            {session ? (
              <nav aria-label="قائمة الإدارة" className="flex items-center gap-4 text-[0.78rem]">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-xs px-2 py-1 text-sage transition-colors hover:text-ivory"
                  >
                    {l.label}
                  </Link>
                ))}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-xs border border-gold/30 px-3 py-1.5 text-[0.72rem] text-gold-pale transition-colors hover:border-gold"
                  >
                    خروج
                  </button>
                </form>
              </nav>
            ) : null}
          </div>
        </header>

        <main id="main" className="container-page flex-1 py-10">
          {children}
        </main>

        <footer className="border-t border-gold/15 py-5">
          <p className="container-page text-[0.68rem] text-ink-muted/70">
            لوحة تحكم آل سليمان — الطلبات محفوظة في قاعدة بيانات محلية.
          </p>
        </footer>
      </body>
    </html>
  );
}
