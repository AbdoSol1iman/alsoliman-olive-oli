"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { saveSettings, type Settings } from "@/lib/settings";
import { bannerSchema, faqItemSchema, offerItemSchema } from "@/lib/admin-schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

const money = z.coerce.number().int().min(0).max(10_000_000);
const optMoney = z.coerce.number().int().min(0).max(10_000_000).nullable();

const phoneLike = z.string().trim().max(30);
const urlLike = z.string().trim().max(300);

const settingsSchemas: Record<keyof Settings, z.ZodType> = {
  store: z.object({
    nameAr: z.string().trim().min(1).max(80),
    nameEn: z.string().trim().min(1).max(80),
    currency: z.string().trim().min(1).max(10),
    currencyAr: z.string().trim().min(1).max(10),
    logoPath: z.string().trim().max(300),
  }),
  contact: z.object({
    whatsappNumber: phoneLike,
    phoneDisplay: phoneLike,
    email: z.string().trim().max(160),
    addressAr: z.string().trim().max(300),
    instagram: urlLike,
    facebook: urlLike,
    tiktok: urlLike,
  }),
  shipping: z.object({
    zones: z.record(
      z.string(),
      z.object({
        ar: z.string().trim().max(60),
        en: z.string().trim().max(60),
        fee: money,
        days: z.string().trim().max(30),
      }),
    ),
    defaultFee: money,
    wholesaleMinQty: z.coerce.number().int().min(1).max(1000),
    codFee: money,
    freeThreshold: optMoney,
    notesAr: z.string().trim().max(500),
    notesEn: z.string().trim().max(500),
  }),
  tax: z.object({
    enabled: z.boolean(),
    ratePercent: z.coerce.number().min(0).max(100),
    includedInPrice: z.boolean(),
    noteAr: z.string().trim().max(300),
    noteEn: z.string().trim().max(300),
  }),
  seo: z.object({
    titleAr: z.string().trim().max(160),
    titleEn: z.string().trim().max(160),
    descriptionAr: z.string().trim().max(400),
    descriptionEn: z.string().trim().max(400),
    ogImage: z.string().trim().max(300).optional(),
  }),
  payments: z.object({
    instapayEnabled: z.boolean(),
    instapayHandle: z.string().trim().max(120),
  }),
  flags: z.object({
    sampleCatalog: z.boolean(),
  }),
  announcements: z.object({
    ar: z.array(z.string().trim().min(1).max(160)).max(10),
    en: z.array(z.string().trim().min(1).max(160)).max(10),
  }),
};

export async function saveSettingsAction(
  section: keyof Settings,
  value: unknown,
): Promise<ActionResult> {
  await requireAdmin();
  const schema = settingsSchemas[section];
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(`${issue?.path.join(".") || section}: ${issue?.message || "invalid"}`);
  }
  try {
    await saveSettings({ [section]: parsed.data } as Partial<Settings>);
    revalidatePath("/admin/settings");
    revalidatePath("/admin", "layout");
    revalidatePath("/ar", "layout");
    revalidatePath("/en", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[admin] save settings failed", e);
    return fail("save_failed");
  }
}

/* ------------------------------------------------------------------ */
/* Website content                                                      */
/* ------------------------------------------------------------------ */

const contentShape = z.record(z.string(), z.unknown());

const contentSchemas: Record<string, z.ZodType> = {
  faq: z.object({
    ar: z.array(faqItemSchema).max(50),
    en: z.array(faqItemSchema).max(50),
  }),
  banners: z.object({
    ar: z.array(bannerSchema).max(8),
    en: z.array(bannerSchema).max(8),
  }),
  media: z.object({
    heroImage: z.string().trim().max(300),
    storyImage: z.string().trim().max(300),
    whyImage: z.string().trim().max(300),
  }),
  offers: z.object({
    ar: z.object({
      eyebrow: z.string().trim().max(80),
      title: z.string().trim().max(160),
      body: z.string().trim().max(300),
      items: z.array(offerItemSchema).max(8),
    }),
    en: z.object({
      eyebrow: z.string().trim().max(80),
      title: z.string().trim().max(160),
      body: z.string().trim().max(300),
      items: z.array(offerItemSchema).max(8),
    }),
  }),
};

const mediaImageField = z.enum(["heroImage", "storyImage", "whyImage"]);

/**
 * Patch one image field of `content:media` without touching the others.
 * Used by section tabs that show a shared homepage image (e.g. the story tab
 * owns `storyImage`, which also lives in the «صور الرئيسية» tab).
 */
export async function saveMediaImageAction(
  field: "heroImage" | "storyImage" | "whyImage",
  path: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedField = mediaImageField.safeParse(field);
  const parsedPath = z.string().trim().max(300).safeParse(path);
  if (!parsedField.success || !parsedPath.success) return fail("invalid_image");

  try {
    const { getContentAdmin, saveContentSection } = await import("@/lib/content");
    const content = await getContentAdmin();
    await saveContentSection("media", { ...content.media, [parsedField.data]: parsedPath.data });
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/homepage");
    revalidatePath("/ar", "layout");
    revalidatePath("/en", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[admin] save media image failed", e);
    return fail("save_failed");
  }
}

export async function saveContentAction(
  section: string,
  value: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const schema = contentSchemas[section] ?? contentShape;
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(`${issue?.path.join(".") || section}: ${issue?.message || "invalid"}`);
  }

  try {
    const { saveContentSection } = await import("@/lib/content");
    await saveContentSection(section as never, parsed.data);
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/homepage");
    revalidatePath("/admin/content");
    revalidatePath("/ar", "layout");
    revalidatePath("/en", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[admin] save content failed", e);
    return fail("save_failed");
  }
}
