import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "./session";
import type { Member, Organization } from "@/types/models";

export interface CurrentSession {
  uid: string;
  email: string;
  member: Member;
  org: Organization;
}

/**
 * Verifies the session cookie against Firebase Admin and loads the caller's
 * membership + organization docs. Returns null for anything that doesn't
 * check out (no cookie, expired/tampered cookie, revoked membership).
 *
 * This — not middleware.ts — is the real authorization boundary for server
 * components and Route Handlers. Firestore Security Rules are the boundary
 * for direct client SDK reads (see firestore.rules).
 */
export type SessionState =
  | { status: "ok"; session: CurrentSession }
  | { status: "no_org" } // valid login, but onboarding never finished
  | { status: "invalid" }; // no/expired/rejected cookie or missing member/org docs

export async function getSessionState(): Promise<SessionState> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return { status: "invalid" };

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    const orgId = decoded.orgId as string | undefined;
    if (!orgId) {
      console.error("getSessionState: session cookie has no orgId claim (onboarding unfinished?)", { uid });
      return { status: "no_org" };
    }

    const db = adminDb();
    const [memberSnap, orgSnap] = await Promise.all([
      db.doc(`organizations/${orgId}/members/${uid}`).get(),
      db.doc(`organizations/${orgId}`).get(),
    ]);

    if (!memberSnap.exists || !orgSnap.exists) {
      console.error("getSessionState: member or org doc missing", { uid, orgId, member: memberSnap.exists, org: orgSnap.exists });
      return { status: "invalid" };
    }
    const member = memberSnap.data() as Member;
    if (member.status !== "active") return { status: "invalid" };

    return {
      status: "ok",
      session: {
        uid,
        email: decoded.email ?? member.email,
        member,
        org: orgSnap.data() as Organization,
      },
    };
  } catch (err) {
    console.error("getSessionState failed:", err);
    return { status: "invalid" };
  }
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const state = await getSessionState();
  return state.status === "ok" ? state.session : null;
}

export async function requireSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
