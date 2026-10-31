import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";


export const viewport: Viewport = {
  themeColor: "#26311f",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "آل سليمان | زيت زيتون بكر ممتاز",
    template: "%s | آل سليمان",
  },
  description:
    "زيت زيتون بكر ممتاز من آل سليمان — عناية بالجودة، طعم أصيل، وتوصيل لجميع محافظات مصر.",
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "آل سليمان",
    title: "آل سليمان | زيت زيتون بكر ممتاز",
    description: "زيت زيتون بكر ممتاز، بمذاق أصيل لمائدتك.",
  },
  icons: { icon: "/favicon.ico" },
};

export function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (raw !== "ar" && raw !== "en") notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={fontVariables}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-svh flex-col bg-ivory text-charcoal">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[60] focus:rounded-xs focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory"
        >
          {locale === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}
        </a>
        <AnnouncementBar locale={locale} />
        <Header locale={locale} dict={dict} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} dict={dict} />
        <CartDrawer locale={locale} dict={dict} />
        <WhatsAppButton dict={dict} />
      </body>
    </html>
  );
}
