"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  addOrderNote,
  deleteOrder,
  deleteOrderNote,
  isOrderStatus,
  updateOrderStatus,
} from "@/lib/orders";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

export async function setOrderStatusAction(formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();

  const reference = String(formData.get("reference") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!reference || !isOrderStatus(status)) return fail("invalid");

  await updateOrderStatus(reference, status, session.name || session.email);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${reference}`);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function deleteOrderAction(reference: string): Promise<ActionResult> {
  await requireAdmin();
  if (!reference) return fail("invalid");

  try {
    const deleted = await deleteOrder(reference);
    if (!deleted) return fail("not_found");

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/customers");
    return { ok: true };
  } catch (e) {
    console.error("[admin] delete order failed", e);
    return fail("delete_failed");
  }
}

export async function addOrderNoteAction(
  orderId: string,
  body: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const trimmed = body.trim();
  if (!orderId || !trimmed) return fail("invalid");
  addOrderNote(orderId, trimmed, session.name || session.email);
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function deleteOrderNoteAction(noteId: string, orderId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!noteId) return fail("invalid");
  deleteOrderNote(noteId);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}
