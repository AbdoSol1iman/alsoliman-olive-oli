"use server";

import { requireAdmin } from "@/lib/auth";
import { setReviewStatus, deleteReview, type ReviewStatus } from "@/lib/reviews";
import { revalidatePath } from "next/cache";

export async function updateReviewStatusAction(id: string, status: ReviewStatus) {
  await requireAdmin();
  const res = await setReviewStatus(id, status);
  revalidatePath("/admin/reviews");
  revalidatePath("/[locale]", "page");
  return res;
}

export async function deleteReviewAction(id: string) {
  await requireAdmin();
  const res = await deleteReview(id);
  revalidatePath("/admin/reviews");
  revalidatePath("/[locale]", "page");
  return res;
}
