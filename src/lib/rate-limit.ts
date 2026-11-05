import "server-only";
import { getDb } from "./db";

/**
 * Persistent checkout throttling.
 *
 * The counter lives in the same libSQL/Turso database as the orders, so the
 * limit is shared by every serverless instance — an in-memory map would reset
 * on each cold start and would not be shared between concurrent lambdas.
 *
 * Rule: at most `RATE_LIMIT_MAX` order attempts per IP in a sliding
 * `RATE_LIMIT_WINDOW_MS` window.
 */
export const RATE_LIMIT_MAX = 3;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** First hop of an IP header, trimmed. */
const firstIp = (value: string | null | undefined) => {
  if (!value) return null;
  const ip = value.split(",")[0]?.trim();
  return ip ? ip : null;
};

/**
 * Resolve the caller IP. Vercel sets `x-real-ip` and `x-forwarded-for`; the
 * fallback keeps local dev / curl working (they share one bucket, which is
 * exactly what the local test server needs).
 */
export function clientIp(headers: Headers): string {
  return (
    firstIp(headers.get("x-real-ip")) ??
    firstIp(headers.get("x-forwarded-for")) ??
    "unknown"
  );
}

/**
 * Record one attempt and report whether it is allowed. The INSERT .. SELECT
 * only inserts while the window still has room, so the check and the write are
 * a single statement (no check-then-insert race inside one instance).
 */
export async function consumeCheckoutAttempt(ip: string): Promise<RateLimitResult> {
  const db = await getDb();
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const result = await db.transaction(async (tx) => {
    // Keep the table small: rows older than the window can never affect a
    // decision again.
    await tx.prepare("DELETE FROM checkout_attempts WHERE created_at < ?").run(windowStart);

    const inserted = await tx
      .prepare(
        `INSERT INTO checkout_attempts (ip, created_at)
         SELECT ?, ?
         WHERE (
           SELECT COUNT(*) FROM checkout_attempts
           WHERE ip = ? AND created_at >= ?
         ) < ?`,
      )
      .run(ip, now, ip, windowStart, RATE_LIMIT_MAX);

    if (inserted.changes > 0) return { allowed: true as const };

    const oldest = await tx
      .prepare(
        "SELECT MIN(created_at) AS oldest FROM checkout_attempts WHERE ip = ? AND created_at >= ?",
      )
      .get<{ oldest: number | null }>(ip, windowStart);

    const oldestTs = Number(oldest?.oldest ?? now);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestTs + RATE_LIMIT_WINDOW_MS - now) / 1000),
    );

    return { allowed: false as const, retryAfterSeconds };
  });

  return result;
}
