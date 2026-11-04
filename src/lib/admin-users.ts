import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  token_version: number;
  role: "owner" | "admin";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

/** Salted scrypt hash — `scrypt$N$r$p$salt$hash` (hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltHex, hashHex] = parts;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export const listAdminUsers = async () => {
  const db = await getDb();
  return db
    .prepare(
      "SELECT id, email, name, token_version, role, created_at, updated_at, last_login_at FROM admin_users ORDER BY created_at",
    )
    .all<AdminUser>();
};

export const findAdminByEmail = async (email: string) => {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM admin_users WHERE email = ?")
    .get<AdminUser & { password_hash: string }>(email.trim().toLowerCase());
};

export const findAdminById = async (id: string) => {
  const db = await getDb();
  return db.prepare("SELECT * FROM admin_users WHERE id = ?").get<AdminUser & { password_hash: string }>(id);
};

export async function createAdminUser({
  email,
  password,
  name = "",
  role = "admin",
}: {
  email: string;
  password: string;
  name?: string;
  role?: "owner" | "admin";
}): Promise<AdminUser> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO admin_users (id, email, name, password_hash, token_version, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .run(id, email.trim().toLowerCase(), name.trim(), hashPassword(password), role, now, now);
  return (await findAdminById(id))!;
}

export async function updateAdminPassword(id: string, password: string) {
  // Bumping token_version invalidates every session ever issued to this user.
  const db = await getDb();
  await db
    .prepare("UPDATE admin_users SET password_hash = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?")
    .run(hashPassword(password), new Date().toISOString(), id);
}

/** Invalidate every outstanding session for a user (without touching the hash). */
export async function bumpTokenVersion(id: string) {
  const db = await getDb();
  await db
    .prepare("UPDATE admin_users SET token_version = token_version + 1, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
}

export async function updateAdminProfile(id: string, { name, email }: { name: string; email: string }) {
  const db = await getDb();
  await db
    .prepare("UPDATE admin_users SET name = ?, email = ?, updated_at = ? WHERE id = ?")
    .run(name.trim(), email.trim().toLowerCase(), new Date().toISOString(), id);
}

export async function touchLastLogin(id: string) {
  const db = await getDb();
  await db.prepare("UPDATE admin_users SET last_login_at = ? WHERE id = ?").run(new Date().toISOString(), id);
}

export async function deleteAdminUser(id: string) {
  const db = await getDb();
  const owners = (await db
    .prepare("SELECT COUNT(*) AS n FROM admin_users WHERE role = 'owner' AND id != ?")
    .get<{ n: number }>(id))!;
  const target = await findAdminById(id);
  if (target?.role === "owner" && owners.n === 0) {
    throw new Error("cannot_delete_last_owner");
  }
  await db.prepare("DELETE FROM admin_users WHERE id = ?").run(id);
}

export async function countAdminUsers() {
  const db = await getDb();
  return (await db.prepare("SELECT COUNT(*) AS n FROM admin_users").get<{ n: number }>())!.n;
}

/**
 * First-run bootstrap: if the table is empty, create the initial account from
 * the environment (or well-known dev credentials outside production). This is
 * the only moment env credentials are ever used.
 */
export async function ensureSeedAdmin() {
  if ((await countAdminUsers()) > 0) return;
  const email = (process.env.ADMIN_EMAIL ?? "admin@alsuliman.local").trim();
  const password = process.env.ADMIN_PASSWORD ?? "alsuliman-dev";
  await createAdminUser({ email, password, name: "المالك", role: "owner" });
}
