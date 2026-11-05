import "server-only";
import { getDb, type Db } from "./db";
import type { AttributionInput } from "./checkout-schema";

export type TrackingEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "WhatsAppOpened";

export type AttributionTouch = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  referrer: string;
  landingPage: string;
};

export type StoredAttribution = {
  visitorId: string;
  sessionId: string;
  first: AttributionTouch;
  last: AttributionTouch;
};

export type TrackingEventInput = {
  id: string;
  eventName: TrackingEventName;
  visitorId: string;
  sessionId: string;
  path?: string;
  productId?: string | null;
  variantId?: string | null;
  orderReference?: string | null;
  value?: number | null;
  currency?: string;
  attribution?: StoredAttribution | AttributionInput | null;
  metadata?: Record<string, unknown>;
  source?: "website" | "server";
  createdAt?: string;
};

const touch = (value: Partial<AttributionTouch> | undefined): AttributionTouch => ({
  utmSource: value?.utmSource ?? "",
  utmMedium: value?.utmMedium ?? "",
  utmCampaign: value?.utmCampaign ?? "",
  utmContent: value?.utmContent ?? "",
  utmTerm: value?.utmTerm ?? "",
  referrer: value?.referrer ?? "",
  landingPage: value?.landingPage ?? "",
});

/** Normalise both the browser payload and stored shapes into one type. */
export function normaliseAttribution(
  value: AttributionInput | StoredAttribution | null | undefined,
): StoredAttribution | null {
  if (!value) return null;
  return {
    visitorId: value.visitorId,
    sessionId: value.sessionId,
    first: touch(value.first),
    last: touch(value.last),
  };
}

/**
 * Persist attribution with the order. The campaign match is by the campaign's
 * `utm_campaign` key; an unmatched UTM is still stored (so reporting can show
 * it) but `campaign_id` stays NULL — never guessed.
 */
export async function attachOrderAttribution(
  tx: Db,
  orderId: string,
  attribution: StoredAttribution | null,
  now: string,
): Promise<string | null> {
  if (!attribution) return null;

  const candidate = attribution.last.utmCampaign || attribution.first.utmCampaign;
  let campaignId: string | null = null;
  if (candidate) {
    const campaign = await tx
      .prepare(
        `SELECT id FROM marketing_campaigns
         WHERE LOWER(utm_campaign) = LOWER(?)
         ORDER BY updated_at DESC LIMIT 1`,
      )
      .get<{ id: string }>(candidate);
    campaignId = campaign?.id ?? null;
  }

  const first = attribution.first;
  const last = attribution.last;
  await tx
    .prepare(
      `INSERT OR IGNORE INTO order_attribution (
        order_id, visitor_id, session_id,
        first_utm_source, first_utm_medium, first_utm_campaign, first_utm_content, first_utm_term,
        first_referrer, first_landing_page,
        last_utm_source, last_utm_medium, last_utm_campaign, last_utm_content, last_utm_term,
        last_referrer, last_landing_page, campaign_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      orderId,
      attribution.visitorId,
      attribution.sessionId,
      first.utmSource,
      first.utmMedium,
      first.utmCampaign,
      first.utmContent,
      first.utmTerm,
      first.referrer,
      first.landingPage,
      last.utmSource,
      last.utmMedium,
      last.utmCampaign,
      last.utmContent,
      last.utmTerm,
      last.referrer,
      last.landingPage,
      campaignId,
      now,
    );

  return campaignId;
}

/** Append-only order status history. */
export async function recordOrderStatus(
  tx: Db,
  orderId: string,
  status: string,
  changedAt: string,
  changedBy = "",
  source: "system" | "admin" = "system",
) {
  await tx
    .prepare(
      `INSERT OR IGNORE INTO order_status_history (id, order_id, status, changed_at, changed_by, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(crypto.randomUUID(), orderId, status, changedAt, changedBy, source);
}

/**
 * Insert an event. The event id is the deduplication key: the browser sends
 * `purchase:<reference>` and the server uses the same id, so a Purchase is
 * counted once whether it arrives from the browser, the server, or both.
 */
export async function recordTrackingEvent(input: TrackingEventInput): Promise<void> {
  const db = await getDb();
  const attribution = normaliseAttribution(input.attribution);
  const last = attribution?.last;
  await db
    .prepare(
      `INSERT OR IGNORE INTO tracking_events (
        id, event_name, visitor_id, session_id, path, product_id, variant_id,
        order_reference, value, currency,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        referrer, landing_page, metadata, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.eventName,
      input.visitorId,
      input.sessionId,
      input.path ?? "",
      input.productId ?? null,
      input.variantId ?? null,
      input.orderReference ?? null,
      input.value ?? null,
      input.currency ?? "EGP",
      last?.utmSource || null,
      last?.utmMedium || null,
      last?.utmCampaign || null,
      last?.utmContent || null,
      last?.utmTerm || null,
      last?.referrer || null,
      last?.landingPage || null,
      JSON.stringify(input.metadata ?? {}),
      input.source ?? "website",
      input.createdAt ?? new Date().toISOString(),
    );
}

/** Server-side Purchase event — fires only after the order transaction commits. */
export async function recordServerPurchase({
  reference,
  total,
  attribution,
  createdAt,
}: {
  reference: string;
  total: number;
  attribution: StoredAttribution | null;
  createdAt: string;
}) {
  if (!attribution) return;
  await recordTrackingEvent({
    id: `purchase:${reference}`,
    eventName: "Purchase",
    visitorId: attribution.visitorId,
    sessionId: attribution.sessionId,
    orderReference: reference,
    value: total,
    attribution,
    metadata: { source: "server" },
    source: "server",
    createdAt,
  });
}
