import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyToken } from "@/lib/session-token";

const locales = ["ar", "en"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/ar", request.url));
  }

  // Admin gate: reject unauthenticated requests here, before any page renders.
  // Doing it in the proxy (rather than only in each page via requireAdmin)
  // avoids a render-time redirect during prefetch, which Next's `instant`
  // navigation validator reports as an error.
  //
  // Admin is a standalone, Arabic-only area — not part of the locale tree.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login" && !verifyToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
      const res = NextResponse.redirect(new URL("/admin/login", request.url));
      res.headers.set("x-robots-tag", "noindex, nofollow");
      return res;
    }
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  if (!hasLocale && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL(`/ar${pathname}${request.nextUrl.search}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Export routes are API surfaces: let them answer 401 themselves instead of
  // redirecting unauthenticated programmatic clients to the HTML login page.
  matcher: [
    "/((?!_next/static|_next/image|api|admin/marketing/export|admin/orders/export|.*\\..*).*)",
  ],
};
