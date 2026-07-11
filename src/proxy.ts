import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";

// Optimistic-only (docs/architecture.md §5, Next 16 Proxy guide): checks
// cookie *presence*, not validity — the real check is the DB round-trip in
// getCurrentSession(), run by every Route Handler / page that needs it.
// `/print` is a special case: it's never visited by a logged-in browser at
// all (only the worker's headless Playwright instance, for PDF-attachment
// rendering — see src/app/print/**) and carries its own shared-secret check
// server-side, so it must bypass the session-cookie redirect entirely rather
// than redirect to /login like every other unauthenticated request.
const PUBLIC_PATHS = ["/login", "/accept-invite", "/reset-password", "/print"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/dasbor", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
