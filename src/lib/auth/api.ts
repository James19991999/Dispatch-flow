import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSession, type CurrentSession } from "./server";
import { roleAtLeast } from "./roles";
import type { Role } from "@/types/models";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Loads and returns the caller's session, or throws an ApiError. Every
 * mutating API route calls this first — it is the server-side half of the
 * RBAC boundary (Firestore Security Rules are the other half, for direct
 * client reads).
 */
export async function requireApiSession(minRole?: Role): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) throw new ApiError(401, "Not signed in");
  if (minRole && !roleAtLeast(session.member.role, minRole)) {
    throw new ApiError(403, "Insufficient permissions");
  }
  return session;
}

export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
