import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSession, type CurrentSession } from "./server";
import { roleAtLeast } from "./roles";
import { rateLimit } from "@/lib/rateLimit";
import type { Role } from "@/types/models";

export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// A generous, blanket per-user safety net across every authenticated API
// route — not a substitute for a per-endpoint budget, but enough to stop a
// runaway client-side loop (a bad useEffect dependency, a retry storm) from
// hammering Firestore through the Admin SDK. See src/lib/rateLimit.ts for
// the honest caveat about per-instance state on serverless.
const GLOBAL_AUTHED_LIMIT = 120;
const GLOBAL_AUTHED_WINDOW_MS = 60_000;

/**
 * Loads and returns the caller's session, or throws an ApiError. Every
 * mutating API route calls this first — it is the server-side half of the
 * RBAC boundary (Firestore Security Rules are the other half, for direct
 * client reads).
 */
export async function requireApiSession(minRole?: Role): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) throw new ApiError(401, "Not signed in");

  const rl = rateLimit(`authed:${session.uid}`, GLOBAL_AUTHED_LIMIT, GLOBAL_AUTHED_WINDOW_MS);
  if (!rl.allowed) {
    throw new ApiError(429, "Too many requests — slow down and try again shortly", rl.retryAfterSeconds);
  }

  if (minRole && !roleAtLeast(session.member.role, minRole)) {
    throw new ApiError(403, "Insufficient permissions");
  }
  return session;
}

export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    const res = NextResponse.json({ error: err.message }, { status: err.status });
    if (err.retryAfterSeconds) res.headers.set("Retry-After", String(err.retryAfterSeconds));
    return res;
  }
  console.error(err);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
