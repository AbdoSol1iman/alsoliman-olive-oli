import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, issueToken, verifyToken } from "./session-token";

export { ADMIN_COOKIE, SESSION_MAX_AGE } from "./session-token";

export const adminEmail = () => process.env.ADMIN_EMAIL ?? "admin@alsuliman.local";
export const adminPassword = () => process.env.ADMIN_PASSWORD ?? "alsuliman-dev";

/** Constant-time credential check. */
export function verifyCredentials(email: string, password: string) {
  const a = Buffer.from(email.trim().toLowerCase());
  const b = Buffer.from(adminEmail().toLowerCase());
  const c = Buffer.from(password);
  const d = Buffer.from(adminPassword());
  return (
    a.length === b.length &&
    c.length === d.length &&
    timingSafeEqual(a, b) &&
    timingSafeEqual(c, d)
  );
}

export async function issueSession(email: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, issueToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function getSession(): Promise<{ email: string } | null> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

/** Server-side gate for every admin page and action. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
