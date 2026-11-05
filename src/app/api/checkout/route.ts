import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";
import { clientIp, consumeCheckoutAttempt } from "@/lib/rate-limit";

/** Checkout responses must never be cached. */
const noStore = { "Cache-Control": "no-store" } as const;

const fail = (code: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ ok: false, code, ...extra }, { status, headers: noStore });

/**
 * `POST /api/checkout`
 *
 * A real HTTP endpoint (rather than a server action) so the rate limiter can
 * answer with an actual `429` and a `Retry-After` header.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_input", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("invalid_input", 400);
  }

  // Honeypot: the field is hidden from humans, so any value means a bot.
  // Reject quietly with a generic validation error and never create an order.
  const honeypot = (body as Record<string, unknown>).website;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return fail("invalid_input", 400);
  }

  // Persistent per-IP limit, shared across serverless instances.
  try {
    const limit = await consumeCheckoutAttempt(clientIp(request.headers));
    if (!limit.allowed) {
      const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
      return NextResponse.json(
        {
          ok: false,
          code: "rate_limited",
          retryAfterSeconds: limit.retryAfterSeconds,
          message: `لقد وصلت إلى الحد الأقصى من المحاولات. يرجى الانتظار ${minutes} دقيقة ثم المحاولة مرة أخرى.`,
        },
        {
          status: 429,
          headers: {
            ...noStore,
            "Retry-After": String(limit.retryAfterSeconds),
          },
        },
      );
    }
  } catch (error) {
    // Never let a limiter outage block legitimate sales. If the database is
    // truly down, `createOrder` below will fail on its own.
    console.error("[checkout] rate limiter unavailable", error);
  }

  try {
    const result = await createOrder(body);
    if (!result.ok) {
      const status =
        result.code === "unavailable" || result.code === "invalid_zone" ? 409 : 400;
      return fail(result.code, status);
    }

    return NextResponse.json(
      {
        ok: true,
        reference: result.reference,
        whatsappHref: result.whatsappHref,
        total: result.total,
      },
      { status: 201, headers: noStore },
    );
  } catch (error) {
    console.error("[checkout] order creation failed", error);
    return fail("server_error", 500);
  }
}
