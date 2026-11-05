import { z } from "zod";
import { CAMPAIGN_STATUSES, DATA_SOURCES, PLATFORMS } from "./marketing-types";

const optionalInt = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().int().min(0).max(10_000_000_000).nullable(),
);

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "invalid_date");

export const mediaBuyerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.union([z.literal(""), z.string().trim().email().max(160)]).default(""),
  startDate: z.union([z.literal(""), isoDate]).default(""),
  platforms: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length).default([]),
  monthlyBudget: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  notes: z.string().trim().max(2000).default(""),
  active: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean(),
  ),
});

export const campaignSchema = z.object({
  name: z.string().trim().min(2).max(160),
  platform: z.enum(PLATFORMS),
  status: z.enum(CAMPAIGN_STATUSES),
  utmCampaign: z.string().trim().max(160).default(""),
  mediaBuyerId: z.string().trim().max(80).nullable().default(null),
  productId: z.string().trim().max(80).nullable().default(null),
  landingPage: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export const adSpendSchema = z.object({
  campaignId: z.string().trim().min(1).max(80),
  date: isoDate,
  spend: z.coerce.number().int().min(0).max(100_000_000),
  impressions: optionalInt,
  reach: optionalInt,
  clicks: optionalInt,
  landingPageViews: optionalInt,
  platformPurchases: optionalInt,
  platformRevenue: optionalInt,
  source: z.enum(DATA_SOURCES).default("manual"),
  notes: z.string().trim().max(1000).default(""),
});

export type MediaBuyerFormInput = z.infer<typeof mediaBuyerSchema>;
export type CampaignFormInput = z.infer<typeof campaignSchema>;
export type AdSpendFormInput = z.infer<typeof adSpendSchema>;
