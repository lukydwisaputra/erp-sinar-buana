import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";

// Optimistic-only (docs/architecture.md §5, Next 16 Proxy guide): checks
// cookie *presence*, not validity — the real check is the DB round-trip in
// getCurrentSession(), run by every Route Handler / page that needs it.
// Redirects a logged-in browser away, since there's nothing for an
// authenticated user to do here (auth forms only).
const PUBLIC_PATHS = ["/login", "/accept-invite", "/reset-password"];

// Never redirected either way, logged in or not — each carries its own
// access check server-side, not the session cookie.
// `/print`: only ever visited by the worker's headless Playwright instance
// (PDF-attachment rendering, see src/app/print/**), gated by a shared secret.
// `/proyek/share`: a real human's anonymous, read-only Proyek link (see
// src/lib/proyek/share-service.ts), gated by its token — including staff who
// open their own copied link while still logged in.
const ANONYMOUS_PATHS = ["/print", "/proyek/share"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (ANONYMOUS_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
};
