"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createCampaign,
  createMediaBuyer,
  deleteAdSpend,
  deleteCampaign,
  setCampaignStatus,
  setMediaBuyerActive,
  updateCampaign,
  updateMediaBuyer,
  upsertAdSpend,
} from "@/lib/marketing-admin";
import {
  adSpendSchema,
  campaignSchema,
  mediaBuyerSchema,
} from "@/lib/marketing-schemas";
import type { CampaignStatus, DataSource, Platform } from "@/lib/marketing-types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

const revalidateMarketing = () => {
  revalidatePath("/admin/marketing", "layout");
};

export async function saveMediaBuyerAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const parsed = mediaBuyerSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    platforms: formData.getAll("platforms").map(String),
    monthlyBudget: formData.get("monthlyBudget") ?? 0,
    notes: String(formData.get("notes") ?? ""),
    active: formData.get("active"),
  });

  if (!parsed.success) return fail("invalid_input");

  try {
    if (id) {
      await updateMediaBuyer(id, {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        startDate: parsed.data.startDate,
        platforms: parsed.data.platforms as Platform[],
        monthlyBudget: parsed.data.monthlyBudget,
        notes: parsed.data.notes,
        active: parsed.data.active,
      });
      revalidateMarketing();
      return { ok: true, id };
    }
    const created = await createMediaBuyer({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      startDate: parsed.data.startDate,
      platforms: parsed.data.platforms as Platform[],
      monthlyBudget: parsed.data.monthlyBudget,
      notes: parsed.data.notes,
      active: parsed.data.active,
    });
    revalidateMarketing();
    return { ok: true, id: created };
  } catch (error) {
    console.error("[marketing] save media buyer failed", error);
    return fail("save_failed");
  }
}

export async function saveCampaignAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const parsed = campaignSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    platform: String(formData.get("platform") ?? "meta"),
    status: String(formData.get("status") ?? "active"),
    utmCampaign: String(formData.get("utmCampaign") ?? ""),
    mediaBuyerId: String(formData.get("mediaBuyerId") ?? "") || null,
    productId: String(formData.get("productId") ?? "") || null,
    landingPage: String(formData.get("landingPage") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) return fail("invalid_input");

  try {
    if (id) {
      await updateCampaign(id, {
        name: parsed.data.name,
        platform: parsed.data.platform as Platform,
        status: parsed.data.status as CampaignStatus,
        utmCampaign: parsed.data.utmCampaign,
        mediaBuyerId: parsed.data.mediaBuyerId,
        productId: parsed.data.productId,
        landingPage: parsed.data.landingPage,
        notes: parsed.data.notes,
      });
      revalidateMarketing();
      return { ok: true, id };
    }
    const created = await createCampaign({
      name: parsed.data.name,
      platform: parsed.data.platform as Platform,
      status: parsed.data.status as CampaignStatus,
      utmCampaign: parsed.data.utmCampaign,
      mediaBuyerId: parsed.data.mediaBuyerId,
      productId: parsed.data.productId,
      landingPage: parsed.data.landingPage,
      notes: parsed.data.notes,
      source: "manual",
    });
    revalidateMarketing();
    return { ok: true, id: created };
  } catch (error) {
    if (error instanceof Error && error.message === "utm_taken") return fail("utm_taken");
    console.error("[marketing] save campaign failed", error);
    return fail("save_failed");
  }
}

export async function saveAdSpendAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = adSpendSchema.safeParse({
    campaignId: String(formData.get("campaignId") ?? ""),
    date: String(formData.get("date") ?? ""),
    spend: formData.get("spend") ?? 0,
    impressions: formData.get("impressions"),
    reach: formData.get("reach"),
    clicks: formData.get("clicks"),
    landingPageViews: formData.get("landingPageViews"),
    platformPurchases: formData.get("platformPurchases"),
    platformRevenue: formData.get("platformRevenue"),
    source: String(formData.get("source") ?? "manual"),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) return fail("invalid_input");

  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.date > today) return fail("future_date");

  try {
    const id = await upsertAdSpend({
      campaignId: parsed.data.campaignId,
      date: parsed.data.date,
      spend: parsed.data.spend,
      impressions: parsed.data.impressions,
      reach: parsed.data.reach,
      clicks: parsed.data.clicks,
      landingPageViews: parsed.data.landingPageViews,
      platformPurchases: parsed.data.platformPurchases,
      platformRevenue: parsed.data.platformRevenue,
      source: parsed.data.source as DataSource,
      notes: parsed.data.notes,
    });
    revalidateMarketing();
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Error && error.message === "campaign_not_found") {
      return fail("campaign_not_found");
    }
    console.error("[marketing] save spend failed", error);
    return fail("save_failed");
  }
}

export async function deleteAdSpendAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return fail("invalid_input");
  try {
    await deleteAdSpend(id);
    revalidateMarketing();
    return { ok: true };
  } catch (error) {
    console.error("[marketing] delete spend failed", error);
    return fail("delete_failed");
  }
}

export async function setCampaignStatusAction(
  id: string,
  status: CampaignStatus,
): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return fail("invalid_input");
  try {
    await setCampaignStatus(id, status);
    revalidateMarketing();
    return { ok: true };
  } catch (error) {
    console.error("[marketing] campaign status failed", error);
    return fail("update_failed");
  }
}

export async function setMediaBuyerActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return fail("invalid_input");
  try {
    await setMediaBuyerActive(id, active);
    revalidateMarketing();
    return { ok: true };
  } catch (error) {
    console.error("[marketing] media buyer status failed", error);
    return fail("update_failed");
  }
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return fail("invalid_input");
  try {
    await deleteCampaign(id);
    revalidateMarketing();
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "campaign_in_use") {
      return fail("campaign_in_use");
    }
    console.error("[marketing] delete campaign failed", error);
    return fail("delete_failed");
  }
}

/* ------------------------------------------------------------------ */
/* Void wrappers for plain <form action={…}> in server components     */
/* ------------------------------------------------------------------ */

export async function setCampaignStatusFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as CampaignStatus;
  await setCampaignStatusAction(id, status);
}

export async function setMediaBuyerActiveFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  await setMediaBuyerActiveAction(id, active);
}

export async function deleteAdSpendFormAction(formData: FormData): Promise<void> {
  await deleteAdSpendAction(String(formData.get("id") ?? ""));
}
