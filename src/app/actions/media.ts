"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteMedia, listMedia, saveUploadedImage, updateMediaMeta } from "@/lib/media";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

const refresh = () => {
  // Media lives in its own library. Revalidating the product editor here made
  // Next re-render the open form after every upload, wiping unsaved edits.
  revalidatePath("/admin/media");
};

/**
 * Upload an image to the persistent media library. The file is optimised to
 * WebP server-side and stored under `data/uploads/` (same volume as the DB).
 */
export async function uploadMediaAction(
  formData: FormData,
): Promise<ActionResult & { path?: string; id?: string }> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("no_file");

  try {
    const item = await saveUploadedImage(file, {
      category: String(formData.get("category") ?? "general"),
      altAr: String(formData.get("altAr") ?? ""),
      altEn: String(formData.get("altEn") ?? ""),
    });
    // No revalidatePath here: the picker reloads the media list itself, while
    // any revalidation would re-render the open product form and drop its
    // unsaved draft. Product pages are revalidated when the product is saved.
    return { ok: true, path: item.path, id: item.id };
  } catch (e) {
    const code = (e as Error).message;
    console.error("[admin] upload failed", code);
    if (code === "unsupported_type") return fail("unsupported_type");
    if (code === "file_too_large") return fail("file_too_large");
    return fail("upload_failed");
  }
}

export async function deleteMediaAction(mediaId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteMedia(mediaId);
    refresh();
    return { ok: true };
  } catch (e) {
    if ((e as Error).message === "media_in_use") return fail("media_in_use");
    return fail("delete_failed");
  }
}

export async function updateMediaMetaAction(
  mediaId: string,
  meta: { altAr?: string; altEn?: string; category?: string },
): Promise<ActionResult> {
  await requireAdmin();
  if (!mediaId) return fail("invalid");
  try {
    updateMediaMeta(mediaId, meta);
    refresh();
    return { ok: true };
  } catch {
    return fail("update_failed");
  }
}

/** Used by the product editor's image picker. */
export async function listMediaAction(category?: string) {
  await requireAdmin();
  return listMedia(category);
}
