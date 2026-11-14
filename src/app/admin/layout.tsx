import type { Metadata, Viewport } from "next";
import "../globals.css";
import { Sidebar } from "@/components/admin/Sidebar";
import { getSession } from "@/lib/auth";
import { fontVariables } from "@/lib/fonts";
import { getPendingReviewsCount } from "@/lib/reviews";
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

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Admin is per-request by definition (session cookie). Signalling that
  // explicitly keeps Next from trying to prerender the session check — which
  // reads an unstable `Date.now()` inside token expiry validation.
  await connection();
  const session = await getSession();

  // Login page (no session): bare document, the login card centers itself.
  if (!session) {
    return (
      <html lang="ar" dir="rtl" className={fontVariables} suppressHydrationWarning>
        <body className="flex min-h-svh items-center justify-center bg-ivory text-charcoal">
          <div className="w-full max-w-sm px-4">{children}</div>
        </body>
      </html>
    );
  }

  const pendingReviewsCount = await getPendingReviewsCount();

  return (
    <html lang="ar" dir="rtl" className={fontVariables} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-svh bg-cream/30 text-charcoal">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[60] focus:rounded-xs focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory"
        >
          تخطَّ إلى المحتوى
        </a>

        <Sidebar name={session.name} email={session.email} pendingReviewsCount={pendingReviewsCount} />

        <div className="lg:ps-64 print:ps-0">
          <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-[1400px] px-4 pb-8 print:hidden md:px-8">
            <p className="border-t border-gold/20 pt-5 text-[0.7rem] text-ink-muted/70">
              لوحة تحكم آل سليمان — البيانات محفوظة في قاعدة بيانات محلية.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
