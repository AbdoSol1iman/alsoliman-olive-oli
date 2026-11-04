import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, SESSION_MAX_AGE, issueToken, verifyToken } from "./session-token";
import {
  ensureSeedAdmin,
  findAdminByEmail,
  findAdminById,
  touchLastLogin,
  verifyPassword,
  type AdminUser,
} from "./admin-users";

export { ADMIN_COOKIE, SESSION_MAX_AGE } from "./session-token";

export type Session = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin";
};

/**
 * Constant-time-ish credential check against the database.
 * A dummy scrypt verify runs for unknown emails so response timing does not
 * reveal whether an account exists.
 */
export function verifyCredentials(email: string, password: string): AdminUser | null {
  ensureSeedAdmin();
  const user = findAdminByEmail(email);
  if (!user) {
    verifyPassword(password, "scrypt$16384$8$1$00000000000000000000000000000000$" + "00".repeat(64));
    return null;
  }
  if (!verifyPassword(password, user.password_hash)) return null;
  touchLastLogin(user.id);
  return user;
}

export async function issueSession(user: { email: string; token_version: number }) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, issueToken(user.email, user.token_version), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/**
 * Full session resolution: signature + expiry (token) and account existence +
 * token version (database). A password change bumps the version, instantly
 * invalidating every outstanding session.
 */
export async function getSession(): Promise<Session | null> {
  ensureSeedAdmin();
  const store = await cookies();
  const payload = verifyToken(store.get(ADMIN_COOKIE)?.value);
  if (!payload) return null;
  const user = findAdminByEmail(payload.email);
  if (!user) return null;
  if (user.token_version !== payload.tv) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Server-side gate for every admin page and action. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Cheap gate for API-style surfaces (route handlers) — returns null instead of redirecting. */
export async function requireAdminApi(): Promise<Session | null> {
  return getSession();
}

export { findAdminById };
