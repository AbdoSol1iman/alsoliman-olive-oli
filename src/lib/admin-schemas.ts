import { z } from "zod";

/**
 * Shared validation for the admin dashboard. Imported by both the client
 * editor forms and the server actions, so what the form allows is exactly
 * what the server accepts.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid_slug");

const shortText = (max = 160) => z.string().trim().max(max);

export const productVariantSchema = z.object({
  id: z.string().trim().max(64).optional().default(""),
  sizeLabelAr: z.string().trim().min(1).max(40),
  sizeLabelEn: z.string().trim().min(1).max(40),
  ml: z.coerce.number().int().min(0).max(100_000),
  price: z.coerce.number().int().min(0).max(10_000_000),
  compareAt: z.coerce.number().int().min(0).max(10_000_000).nullable().default(null),
  /** null / undefined = stock not tracked. */
  stock: z.coerce.number().int().min(0).max(1_000_000).nullable().default(null),
  /** null / undefined = cost unknown → gross profit stays unavailable. */
  cost: z.coerce.number().int().min(0).max(10_000_000).nullable().default(null),
  sku: z.string().trim().max(64).default(""),
});

export const productImageSchema = z.object({
  src: z.string().trim().min(1).max(300),
  altAr: z.string().trim().max(200).default(""),
  altEn: z.string().trim().max(200).default(""),
  isPrimary: z.boolean().default(false),
});

export const productSpecSchema = z.object({
  labelAr: z.string().trim().min(1).max(80),
  labelEn: z.string().trim().min(1).max(80),
  valueAr: z.string().trim().min(1).max(160),
  valueEn: z.string().trim().min(1).max(160),
});

export const productInputSchema = z.object({
  slug: slugSchema,
  categoryId: z.string().trim().max(64).nullable().default(null),
  nameAr: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  subtitleAr: shortText().default(""),
  subtitleEn: shortText().default(""),
  hookAr: shortText(300).default(""),
  hookEn: shortText(300).default(""),
  descriptionAr: z.array(z.string().trim().min(1).max(1200)).max(12).default([]),
  descriptionEn: z.array(z.string().trim().min(1).max(1200)).max(12).default([]),
  storageAr: shortText(400).default(""),
  storageEn: shortText(400).default(""),
  badgeAr: shortText(40).nullable().default(null),
  badgeEn: shortText(40).nullable().default(null),
  specs: z.array(productSpecSchema).max(20).default([]),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  comingSoon: z.boolean().default(false),
  sample: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(-10_000).max(10_000).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(5),
  variants: z.array(productVariantSchema).min(1).max(20),
  images: z.array(productImageSchema).max(12).default([]),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  slug: slugSchema,
  nameAr: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
  active: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const passwordSchema = z
  .string()
  .min(8, "password_too_short")
  .max(200)
  .regex(/[a-zA-Z]/, "password_needs_letter")
  .regex(/[0-9]/, "password_needs_digit");

export const emailSchema = z.string().trim().email().max(160);

export const faqItemSchema = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1000),
});

export const bannerSchema = z.object({
  title: z.string().trim().max(160).default(""),
  subtitle: z.string().trim().max(300).default(""),
  image: z.string().trim().max(300).default(""),
  href: z.string().trim().max(300).default(""),
  cta: z.string().trim().max(80).default(""),
  enabled: z.boolean().default(true),
});

export type FaqItem = z.infer<typeof faqItemSchema>;
export type Banner = z.infer<typeof bannerSchema>;
