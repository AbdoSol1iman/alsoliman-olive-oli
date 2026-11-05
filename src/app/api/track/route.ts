import { NextResponse } from "next/server";
import { z } from "zod";
import { attributionSchema } from "@/lib/checkout-schema";
import { recordTrackingEvent, type TrackingEventName } from "@/lib/tracking";

const EVENT_NAMES = [
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
  "WhatsAppOpened",
] as const;

const eventSchema = z.object({
  id: z.string().trim().min(8).max(120),
  eventName: z.enum(EVENT_NAMES),
  path: z.string().trim().max(500).default(""),
  productId: z.string().trim().max(120).nullable().optional(),
  variantId: z.string().trim().max(120).nullable().optional(),
  orderReference: z.string().trim().max(40).nullable().optional(),
  value: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.string().trim().max(8).default("EGP"),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  attribution: attributionSchema,
});

/**
 * Metadata is free-form, so PII can hide under nested keys or as a value.
 * Normalise keys before comparison ("customer_name" → "customername") and
 * reject common PII values as well. Analytics never needs either.
 */
const PII_KEYS = new Set([
  "name",
  "fullname",
  "firstname",
  "lastname",
  "customername",
  "phone",
  "phonenumber",
  "mobile",
  "whatsapp",
  "email",
  "emailaddress",
  "address",
  "shippingaddress",
  "billingaddress",
  "note",
  "notes",
  "customernotes",
]);

const normaliseKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const PII_VALUE_PATTERNS = [
  // e-mail address
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Egyptian mobile number, with or without country code
  /(?:\+?20|0)?1[0125]\d{8}/,
];

function containsPii(value: unknown, depth = 0): boolean {
  if (depth > 5) return true;
  if (typeof value === "string") {
    return PII_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsPii(entry, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, entry]) => PII_KEYS.has(normaliseKey(key)) || containsPii(entry, depth + 1),
    );
  }
  return false;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const data = parsed.data;
  const serialisedMeta = JSON.stringify(data.metadata ?? {});
  if (containsPii(data.metadata) || serialisedMeta.length > 2000) {
    return NextResponse.json({ ok: false, code: "invalid_metadata" }, { status: 400 });
  }

  try {
    await recordTrackingEvent({
      id: data.id,
      eventName: data.eventName as TrackingEventName,
      visitorId: data.attribution.visitorId,
      sessionId: data.attribution.sessionId,
      path: data.path,
      productId: data.productId ?? null,
      variantId: data.variantId ?? null,
      orderReference: data.orderReference ?? null,
      value: data.value ?? null,
      currency: data.currency,
      attribution: data.attribution,
      metadata: data.metadata,
      source: "website",
    });
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[track] failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
