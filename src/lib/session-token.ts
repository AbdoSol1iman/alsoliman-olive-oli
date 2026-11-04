/**
 * Signed admin-session token helpers.
 *
 * Pure Node crypto, no React / Next imports — so the same verification can run
 * both in `src/proxy.ts` (which defaults to the Node runtime) and in server
 * components/actions. That lets the proxy reject unauthenticated `/admin`
 * requests before any page renders, which also keeps Next's `instant`
 * navigation validator quiet (no render-time redirect during prefetch).
 *
 * The token carries `tv` (token version) — a per-user counter that is bumped
 * whenever the password changes, so every previously issued session becomes
 * invalid immediately. The proxy only checks the signature (no DB access);
 * `requireAdmin()` re-checks `tv` against the database as defence in depth.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "slm_admin";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Session signing secret.
 * - Production: ADMIN_SESSION_SECRET is REQUIRED. A per-process random
 *   fallback is not safe here: the proxy (middleware) and the server run in
 *   separate module instances, so each would generate a different key and
 *   every session would be rejected — silently breaking admin login. Failing
 *   loudly at request time is the honest failure mode.
 * - Development: a well-known constant so local logins work out of the box.
 */
export function sessionSecret() {
  const configured = (process.env.ADMIN_SESSION_SECRET ?? process.env.SESSION_SECRET ?? "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set. Admin sessions cannot be signed in production. " +
        "Generate one with `openssl rand -hex 32` and set it in the environment " +
        "(see .env.example).",
    );
  }
  return "dev-only-insecure-secret-change-me";
}

const sign = (payload: string) =>
  createHmac("sha256", sessionSecret()).update(payload).digest("base64url");

export function issueToken(email: string, tokenVersion = 0, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ email, tv: tokenVersion, exp: now + SESSION_MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export type TokenPayload = { email: string; tv: number };

/** Constant-time signature check; returns the payload or null. */
export function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email: string;
      tv?: number;
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.email) return null;
    return { email: data.email, tv: typeof data.tv === "number" ? data.tv : 0 };
  } catch {
    return null;
  }
}
