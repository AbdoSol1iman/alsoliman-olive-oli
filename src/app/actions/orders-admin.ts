"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { addOrderNote, deleteOrderNote, isOrderStatus, updateOrderStatus } from "@/lib/orders";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

export async function setOrderStatusAction(formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();
  void session;

  const reference = String(formData.get("reference") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!reference || !isOrderStatus(status)) return fail("invalid");

  updateOrderStatus(reference, status);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${reference}`);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  return { ok: true };
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
