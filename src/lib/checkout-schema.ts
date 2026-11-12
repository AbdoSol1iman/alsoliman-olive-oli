import { z } from "zod";

/** Upper bounds so a scripted request cannot post an enormous cart. */
export const MAX_ORDER_LINES = 20;
export const MAX_ORDER_QTY = 60;

/** One captured touch — UTM values, external referrer and landing page. */
export const attributionTouchSchema = z.object({
  utmSource: z.string().trim().max(160).default(""),
  utmMedium: z.string().trim().max(160).default(""),
  utmCampaign: z.string().trim().max(160).default(""),
  utmContent: z.string().trim().max(160).default(""),
  utmTerm: z.string().trim().max(160).default(""),
  referrer: z.string().trim().max(500).default(""),
  landingPage: z.string().trim().max(500).default(""),
});

export const attributionSchema = z.object({
  visitorId: z.string().trim().min(8).max(80),
  sessionId: z.string().trim().min(8).max(80),
  first: attributionTouchSchema,
  last: attributionTouchSchema,
});

export type AttributionInput = z.infer<typeof attributionSchema>;

/**
 * Governorate is validated against the *settings* zones inside `createOrder`
 * (the zone list is owner-editable), so here we only require a sane string.
 */
export const checkoutSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => /^01[0125][0-9]{8}$/.test(v), "invalid_phone"),
  governorate: z.string().trim().min(1).max(60),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(400),
  notes: z.string().trim().max(500).optional().default(""),
  payment: z.enum(["cod", "instapay"]).default("cod"),
  locale: z.enum(["ar", "en"]).default("ar"),
  idempotencyKey: z.string().trim().min(8).max(64),
  /** First-touch + last-touch marketing attribution captured by the browser. */
  attribution: attributionSchema.optional(),
  /**
   * Honeypot. Humans never see or fill it; `createOrder` refuses any non-empty
   * value even if a future caller bypasses the HTTP route.
   */
  website: z.string().trim().max(200).optional().default(""),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(120),
        variantId: z.string().min(1).max(120),
        qty: z.number().int().min(1).max(50),
        unitPrice: z.number().int().min(0).max(10_000_000).optional(),
        offerTitle: z.string().trim().max(160).optional(),
      }),
    )
    .min(1)
    .max(MAX_ORDER_LINES)
    .refine((items) => items.reduce((sum, item) => sum + item.qty, 0) <= MAX_ORDER_QTY, {
      message: "invalid_quantity",
    }),
}).refine((value) => value.website === "", { message: "invalid_input", path: ["website"] });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const fieldErrors = (issues: { path: PropertyKey[]; message: string }[]) => {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!map[key]) map[key] = issue.message;
  }
  return map;
};

export const egPhone = /^01[0125][0-9]{8}$/;
