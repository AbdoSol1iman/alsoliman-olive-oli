"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { captureAttribution, ensureAnalyticsIds, trackEvent } from "@/lib/analytics";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-WJ4M9JGH";

type FbqStub = ((...args: unknown[]) => void) & {
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

/** Set up queue stubs before the vendor scripts finish loading. */
function installStubs() {
  const w = window as unknown as {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: FbqStub;
  };
  w.dataLayer = w.dataLayer ?? [];

  if (!w.gtag) {
    w.gtag = (...args: unknown[]) => {
      w.dataLayer!.push(args);
    };
  }

  // The official Meta snippet bails out when `fbq` already exists, so a plain
  // stub would stop the real pixel from loading. Create the standard queue and
  // load fbevents.js ourselves, exactly like the snippet does.
  if (META_PIXEL_ID && !w.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (!fbq.queue) fbq.queue = [];
      fbq.queue.push(args);
    }) as FbqStub;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    w.fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    fbq("init", META_PIXEL_ID);
  }
}

/**
 * Tracks one PageView per path per tab and keeps UTM/referrer attribution in
 * localStorage so it survives the whole shopping journey.
 */
export function TrackingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    installStubs();
    ensureAnalyticsIds();
    captureAttribution();
    trackEvent("PageView", { path: pathname });
  }, [pathname]);

  return (
    <>
      {GA4_ID ? (
        <>
          <Script
            id="ga4-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}', { send_page_view: false });`}
          </Script>
        </>
      ) : null}

      {GTM_ID ? (
        <>
          <Script
            id="gtm-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
          />
          <Script id="gtm-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`}
          </Script>
        </>
      ) : null}

      {children}
    </>
  );
}
