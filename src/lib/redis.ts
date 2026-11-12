import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Shared Upstash Redis client (HTTP REST — no connection pooling, safe for
 * serverless and edge runtimes).
 *
 * Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from the
 * environment. One client per process via the same globalThis trick the
 * libSQL database uses.
 *
 * Note: the SDK serialises JavaScript values automatically — pass objects,
 * numbers and arrays directly instead of JSON.stringify-ing them.
 *
 * Namespace keys by feature, e.g. `cart:{id}`, `ratelimit:{ip}`.
 */
const globalForRedis = globalThis as unknown as { __alsulimanRedis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.__alsulimanRedis) {
    // Throws a clear error when the credentials are missing.
    globalForRedis.__alsulimanRedis = Redis.fromEnv();
  }
  return globalForRedis.__alsulimanRedis;
}
