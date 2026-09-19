import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Edge middleware only checks whether a session cookie is *present* and
// redirects for UX purposes. It cannot run firebase-admin (Node-only) on the
// Edge runtime, so it is explicitly NOT the security boundary — every
// server component and API route re-verifies the cookie server-side via
// lib/auth/server.ts, and Firestore Security Rules gate direct client reads.
// A visitor with a forged/expired cookie gets past this redirect but is
// rejected the moment any real data is requested.

const PUBLIC_PATHS = ["/login", "/forgot-password", "/onboarding", "/invite"];
const APP_ROOT_REDIRECT = "/dashboard";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!hasSession && !isPublic && pathname !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && (pathname === "/login" || pathname === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = APP_ROOT_REDIRECT;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (they do their own auth)
     * - _next static/image
     * - favicon, manifest, public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
