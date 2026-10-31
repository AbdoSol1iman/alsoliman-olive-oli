"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSession, getSession, issueSession, verifyCredentials } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function loginAction(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!verifyCredentials(email, password)) {
    return "بيانات الدخول غير صحيحة.";
  }
  await issueSession(email);
  redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  redirect("/admin/login");
}

export async function updateOrderStatusAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const reference = String(formData.get("reference") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!reference || !allowed.includes(status)) return { ok: false, error: "invalid" };

  getDb()
    .prepare("UPDATE orders SET status = ? WHERE reference = ?")
    .run(status, reference);

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${reference}`);
  return { ok: true };
}

export async function setOrderStatusAction(formData: FormData) {
  await updateOrderStatusAction(formData);
}
