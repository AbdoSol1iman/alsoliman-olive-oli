import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CatalogProvider } from "@/lib/catalog-client";
import { TrackingProvider } from "@/components/analytics/TrackingProvider";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getSiteDictionary } from "@/lib/content";
import { buildOpenGraph } from "@/lib/metadata";
import type { Locale } from "@/lib/products";
import { Analytics } from "@vercel/analytics/next";


export const viewport: Viewport = {
  themeColor: "#26311f",
  colorScheme: "light",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const isAr = raw !== "en";
  const settings = await getSettings();
  const title = isAr ? settings.seo.titleAr : settings.seo.titleEn;
  const description = isAr ? settings.seo.descriptionAr : settings.seo.descriptionEn;
  const siteName = isAr ? settings.store.nameAr : settings.store.nameEn;
  const og = await buildOpenGraph({
    locale: isAr ? "ar" : "en",
    path: `/${isAr ? "ar" : "en"}`,
    title,
    description,
  });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: title, template: `%s | ${siteName}` },
    description,
    openGraph: og,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: og.images,
    },
    icons: { icon: "/favicon.ico" },
  };
}

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
  const [settings, { products }, dict] = await Promise.all([
    getSettings(),
    getCatalog(),
    getSiteDictionary(locale),
  ]);

  const contact = {
    instagram: settings.contact.instagram,
    facebook: settings.contact.facebook,
    whatsappNumber: settings.contact.whatsappNumber,
    phoneDisplay: settings.contact.phoneDisplay,
    email: settings.contact.email,
  };
  const announcements = settings.announcements[locale] ?? settings.announcements.ar;

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
        <TrackingProvider>
          <CatalogProvider products={products}>
            <AnnouncementBar locale={locale} items={announcements} />
            <Header locale={locale} dict={dict} logoSrc={settings.store.logoPath} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer locale={locale} dict={dict} contact={contact} logoSrc={settings.store.logoPath} />
            <CartDrawer locale={locale} dict={dict} />
            <WhatsAppButton dict={dict} whatsappNumber={settings.contact.whatsappNumber} />
          </CatalogProvider>
        </TrackingProvider>
        <Analytics />
      </body>
    </html>
  );
}
