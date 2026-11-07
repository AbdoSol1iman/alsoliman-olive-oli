"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  listProductsAdmin,
  moveProduct,
  setProductFlags,
  updateCategory,
  updateProduct,
} from "@/lib/catalog";
import { categoryInputSchema, productInputSchema } from "@/lib/admin-schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

/** Shared refresh after a catalog mutation so the dashboard shows fresh data. */
const refreshAdmin = () => {
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin", "layout");
};

export async function saveProductAction(
  productId: string | null,
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(`${issue?.path.join(".") || "form"}: ${issue?.message || "invalid"}`);
  }

  const data = parsed.data;
  const duplicate = (await listProductsAdmin()).find((p) => p.slug === data.slug && p.id !== productId);
  if (duplicate) return fail("slug_taken");

  try {
    const id = productId ?? (await createProduct(data));
    if (productId) await updateProduct(productId, data);
    refreshAdmin();
    return { ok: true, id };
  } catch (e) {
    console.error("[admin] save product failed", e);
    return fail("save_failed");
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!productId) return fail("invalid");
  try {
    await deleteProduct(productId);
    refreshAdmin();
    return { ok: true };
  } catch (e) {
    console.error("[admin] delete product failed", e);
    return fail("delete_failed");
  }
}

export async function toggleProductFlagAction(
  productId: string,
  flag: "active" | "featured" | "comingSoon",
  value: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await setProductFlags(productId, { [flag]: value });
    refreshAdmin();
    return { ok: true };
  } catch {
    return fail("update_failed");
  }
}

export async function moveProductAction(
  productId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await moveProduct(productId, direction);
    refreshAdmin();
    return { ok: true };
  } catch {
    return fail("update_failed");
  }
}

/* ------------------------------------------------------------------ */
/* Categories                                                           */
/* ------------------------------------------------------------------ */

export async function saveCategoryAction(
  categoryId: string | null,
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  try {
    const id = categoryId ?? (await createCategory(parsed.data));
    if (categoryId) await updateCategory(categoryId, parsed.data);
    refreshAdmin();
    return { ok: true, id };
  } catch (e) {
    console.error("[admin] save category failed", e);
    return fail("save_failed");
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteCategory(categoryId);
    refreshAdmin();
    return { ok: true };
  } catch {
    return fail("delete_failed");
  }
}
