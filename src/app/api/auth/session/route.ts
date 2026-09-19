import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth/session";

// Exchanges a fresh Firebase ID token (which already carries the orgId
// custom claim once the caller has an organization) for an httpOnly session
// cookie. This is the standard Firebase SSR pattern: the ID token never
// touches a cookie directly, only this derived session cookie does.
export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({ idToken: null }));
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    // Require a recently issued token (< 5 min) before minting a long-lived
    // session cookie, matching Firebase's own guidance.
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    const authTimeMs = decoded.auth_time * 1000;
    if (Date.now() - authTimeMs > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Recent sign-in required" }, { status: 401 });
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_MAX_AGE_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
