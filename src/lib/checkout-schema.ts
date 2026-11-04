import { z } from "zod";

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
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1),
});

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
