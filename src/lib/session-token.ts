/**
 * Signed admin-session token helpers.
 *
 * Pure Node crypto, no React / Next imports — so the same verification can run
 * both in `src/proxy.ts` (which defaults to the Node runtime) and in server
 * components/actions. That lets the proxy reject unauthenticated `/admin`
 * requests before any page renders, which also keeps Next's `instant`
 * navigation validator quiet (no render-time redirect during prefetch).
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "slm_admin";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

let processSecret: string | null = null;

/**
 * Session signing secret.
 * - Production: uses ADMIN_SESSION_SECRET. If it is missing we fall back to a
 *   random per-process key rather than shipping a fixed, guessable secret —
 *   sessions then invalidate on every restart, which is the safe failure mode.
 * - Development: a well-known constant so local logins work out of the box.
 */
export function sessionSecret() {
  const configured = (process.env.ADMIN_SESSION_SECRET ?? process.env.SESSION_SECRET ?? "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    if (!processSecret) {
      processSecret = randomBytes(32).toString("hex");
      console.warn(
        "[auth] ADMIN_SESSION_SECRET is not set — using a random per-process key. Admin sessions will not survive restarts. Set ADMIN_SESSION_SECRET in the environment.",
      );
    }
    return processSecret;
  }
  return "dev-only-insecure-secret-change-me";
}

const sign = (payload: string) =>
  createHmac("sha256", sessionSecret()).update(payload).digest("base64url");

export function issueToken(email: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: now + SESSION_MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Constant-time signature check; returns the payload or null. */
export function verifyToken(token: string | undefined): { email: string } | null {
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
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}
