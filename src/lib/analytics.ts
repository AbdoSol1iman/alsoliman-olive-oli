"use client";

/**
 * Browser-side analytics context.
 *
 * Only anonymous ids, campaign parameters and page paths leave the browser.
 * Names, phone numbers, addresses and order notes are never included in any
 * analytics event.
 */

export type AnalyticsTouch = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  referrer: string;
  landingPage: string;
};

export type AnalyticsContext = {
  visitorId: string;
  sessionId: string;
  first: AnalyticsTouch;
  last: AnalyticsTouch;
};

export type AnalyticsEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "WhatsAppOpened";

type EventOptions = {
  path?: string;
  productId?: string | null;
  variantId?: string | null;
  orderReference?: string | null;
  value?: number | null;
  currency?: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
};

const VISITOR_KEY = "alsuliman_visitor_id";
const SESSION_KEY = "alsuliman_session_id";
const FIRST_KEY = "alsuliman_attribution_first";
const LAST_KEY = "alsuliman_attribution_last";

// Vendor tags only receive events when their own ID is configured.
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";

const emptyTouch = (): AnalyticsTouch => ({
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
  referrer: "",
  landingPage: "",
});

const uuid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const read = (storage: "local" | "session", key: string): string => {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key) ?? "";
  } catch {
    return "";
  }
};

const write = (storage: "local" | "session", key: string, value: string) => {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // private mode / storage disabled — tracking still works for this page
  }
};

const readTouch = (key: string): AnalyticsTouch | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnalyticsTouch>;
    return { ...emptyTouch(), ...parsed };
  } catch {
    return null;
  }
};

const currentTouch = (): AnalyticsTouch => {
  if (typeof window === "undefined") return emptyTouch();
  const params = new URLSearchParams(window.location.search);
  const get = (key: string) => (params.get(key) ?? "").trim().slice(0, 160);
  const ref = document.referrer || "";
  let externalReferrer = "";
  try {
    if (ref && new URL(ref).origin !== window.location.origin) externalReferrer = ref.slice(0, 500);
  } catch {
    externalReferrer = ref.slice(0, 500);
  }
  return {
    utmSource: get("utm_source"),
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
    utmContent: get("utm_content"),
    utmTerm: get("utm_term"),
    referrer: externalReferrer,
    landingPage: `${window.location.pathname}${window.location.search}`.slice(0, 500),
  };
};

const hasCampaign = (touch: AnalyticsTouch) =>
  Boolean(
    touch.utmSource ||
      touch.utmMedium ||
      touch.utmCampaign ||
      touch.utmContent ||
      touch.utmTerm ||
      touch.referrer,
  );

/** Create/read the anonymous ids once per visitor and browser tab. */
export function ensureAnalyticsIds(): { visitorId: string; sessionId: string } {
  if (typeof window === "undefined") return { visitorId: "", sessionId: "" };
  let visitorId = read("local", VISITOR_KEY);
  let sessionId = read("session", SESSION_KEY);
  if (!visitorId) {
    visitorId = `v_${uuid()}`;
    write("local", VISITOR_KEY, visitorId);
  }
  if (!sessionId) {
    sessionId = `s_${uuid()}`;
    write("session", SESSION_KEY, sessionId);
  }
  return { visitorId, sessionId };
}

/**
 * Capture first touch once and keep the most recent campaign touch as last
 * touch. Internal navigation never overwrites last touch with a direct visit.
 */
export function captureAttribution(): AnalyticsContext | null {
  if (typeof window === "undefined") return null;
  const { visitorId, sessionId } = ensureAnalyticsIds();
  const incoming = currentTouch();
  let first = readTouch(FIRST_KEY);
  let last = readTouch(LAST_KEY);

  if (!first) {
    first = incoming;
    write("local", FIRST_KEY, JSON.stringify(first));
  }
  if (!last || hasCampaign(incoming)) {
    last = incoming;
    write("local", LAST_KEY, JSON.stringify(last));
  }

  return { visitorId, sessionId, first, last };
}

export function getAttribution(): AnalyticsContext | null {
  return captureAttribution();
}

type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

const metaEvent = (name: AnalyticsEventName): MetaStandardEvent | null =>
  name === "WhatsAppOpened" ? null : name;

/**
 * GA4 event names are fixed, case-sensitive and differ from Meta's. Sending
 * `PageView`/`Purchase` to gtag would land as custom events, so map them to
 * GA4's own ecommerce names while keeping the internal/Meta vocabulary.
 */
const ga4Event = (name: AnalyticsEventName): string =>
  ({
    PageView: "page_view",
    ViewContent: "view_item",
    AddToCart: "add_to_cart",
    InitiateCheckout: "begin_checkout",
    Purchase: "purchase",
    WhatsAppOpened: "whatsapp_opened",
  })[name];

const integrationParams = (name: AnalyticsEventName, options: EventOptions) => {
  const value = typeof options.value === "number" ? options.value : undefined;
  const base: Record<string, unknown> = {};
  if (value !== undefined) {
    base.value = value;
    base.currency = options.currency ?? "EGP";
  }
  if (options.productId) {
    base.content_type = "product";
    base.content_ids = [options.variantId || options.productId];
  }
  if (options.orderReference) base.order_reference = options.orderReference;
  if (name === "Purchase" && options.orderReference) base.transaction_id = options.orderReference;
  return base;
};

/** Send to the internal store + any configured Meta/GA4/GTM endpoints. */
export function trackEvent(name: AnalyticsEventName, options: EventOptions = {}) {
  if (typeof window === "undefined") return;

  const dispatch = () => {
    try {
      const context = captureAttribution();
      if (!context) return;

      const path = options.path ?? `${window.location.pathname}${window.location.search}`;
      const eventId =
        options.eventId ??
        (name === "PageView"
          ? `pv:${context.sessionId}:${window.location.pathname}`
          : name === "ViewContent" && options.productId
            ? `vc:${context.sessionId}:${options.productId}:${options.variantId ?? ""}`
            : name === "InitiateCheckout"
              ? `ic:${context.sessionId}`
              : name === "Purchase" && options.orderReference
                ? `purchase:${options.orderReference}`
                : name === "WhatsAppOpened" && options.orderReference
                  ? `wa:${options.orderReference}`
                  : `ev:${uuid()}`);

      const payload = {
        id: eventId,
        eventName: name,
        path: path.slice(0, 500),
        productId: options.productId ?? null,
        variantId: options.variantId ?? null,
        orderReference: options.orderReference ?? null,
        value: options.value ?? null,
        currency: options.currency ?? "EGP",
        metadata: options.metadata ?? {},
        attribution: context,
      };

      try {
        const body = JSON.stringify(payload);
        const sent = navigator.sendBeacon?.(
          "/api/track",
          new Blob([body], { type: "application/json" }),
        );
        if (!sent) {
          void fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => undefined);
        }
      } catch {
        // analytics must never break the store
      }

      const params = integrationParams(name, options);
      const gtmEvent = `alsuliman_${name}`;
      const gaParams: Record<string, unknown> = {
        ...params,
        event_id: eventId,
      };
      if (options.productId) {
        gaParams.items = [
          {
            item_id: options.variantId || options.productId,
            item_variant: options.variantId || undefined,
          },
        ];
      }

      type Fbq = (...args: unknown[]) => void;
      type Gtag = (...args: unknown[]) => void;
      const w = window as unknown as {
        fbq?: Fbq;
        gtag?: Gtag;
        dataLayer?: unknown[];
      };

      if (GTM_ID && w.dataLayer) {
        w.dataLayer.push({ event: gtmEvent, ga4_event: ga4Event(name), event_id: eventId, ...params });
      }

      if (GA4_ID && w.gtag) {
        w.gtag("event", ga4Event(name), gaParams);
      }

      const standard = metaEvent(name);
      if (META_PIXEL_ID && w.fbq && standard) {
        w.fbq("track", standard, params, { eventID: eventId });
      } else if (META_PIXEL_ID && w.fbq) {
        w.fbq("trackCustom", name, params, { eventID: eventId });
      }
    } catch {
      // analytics must never break the store
    }
  };

  // Offload from critical input path to prevent blocking UI updates
  if (typeof queueMicrotask === "function") {
    queueMicrotask(dispatch);
  } else {
    setTimeout(dispatch, 0);
  }
}
