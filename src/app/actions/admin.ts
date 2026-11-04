"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clearSession, getSession, issueSession, requireAdmin, verifyCredentials } from "@/lib/auth";
import {
  bumpTokenVersion,
  createAdminUser,
  deleteAdminUser,
  findAdminById,
  listAdminUsers,
  updateAdminPassword,
  updateAdminProfile,
} from "@/lib/admin-users";
import { emailSchema, passwordSchema } from "@/lib/admin-schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

export async function loginAction(_prev: string | null, formData: FormData): Promise<string | null> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyCredentials(email, password);
  if (!user) return "بيانات الدخول غير صحيحة.";
  await issueSession(user);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ */
/* Profile                                                              */
/* ------------------------------------------------------------------ */

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
});

export async function updateProfileAction(input: z.infer<typeof profileSchema>): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");

  const duplicate = (await listAdminUsers()).find(
    (u) => u.email === parsed.data.email.toLowerCase() && u.id !== session.id,
  );
  if (duplicate) return fail("email_taken");

  await updateAdminProfile(session.id, parsed.data);
  // Email is part of the signed token — bump the version and reissue so the
  // current session stays valid and every other one dies.
  await bumpTokenVersion(session.id);
  const user = (await findAdminById(session.id))!;
  await issueSession(user);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function changePasswordAction(input: {
  current: string;
  next: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  const verified = await verifyCredentials(session.email, input.current);
  if (!verified || verified.id !== session.id) return fail("wrong_current_password");

  const parsed = passwordSchema.safeParse(input.next);
  if (!parsed.success) return fail("weak_password");
  if (input.current === input.next) return fail("password_unchanged");

  await updateAdminPassword(session.id, input.next);
  const user = (await findAdminById(session.id))!;
  await issueSession(user); // fresh token carries the new version
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Admin users (managed by owners from Settings)                        */
/* ------------------------------------------------------------------ */

const createAdminSchema = z.object({
  email: emailSchema,
  name: z.string().trim().max(80).default(""),
  password: passwordSchema,
  role: z.enum(["owner", "admin"]).default("admin"),
});

export async function createAdminAction(input: z.infer<typeof createAdminSchema>): Promise<ActionResult & { id?: string }> {
  const session = await requireAdmin();
  if (session.role !== "owner") return fail("forbidden");
  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");

  const existing = (await listAdminUsers()).find((u) => u.email === parsed.data.email.toLowerCase());
  if (existing) return fail("email_taken");

  const user = await createAdminUser(parsed.data);
  revalidatePath("/admin", "layout");
  void session;
  return { ok: true, id: user.id };
}

export async function deleteAdminAction(userId: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.role !== "owner") return fail("forbidden");
  if (userId === session.id) return fail("cannot_delete_self");
  try {
    await deleteAdminUser(userId);
  } catch (e) {
    return fail((e as Error).message);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function resetAdminPasswordAction(userId: string, password: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.role !== "owner") return fail("forbidden");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return fail("weak_password");
  if (!(await findAdminById(userId))) return fail("not_found");
  await updateAdminPassword(userId, password);
  return { ok: true };
}
