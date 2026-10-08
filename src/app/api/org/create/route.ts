import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { defaultDepotFor } from "@/lib/depotDefaults";
import type { Member, Organization } from "@/types/models";

const schema = z.object({
  idToken: z.string().min(10),
  orgName: z.string().min(2).max(80),
  depotName: z.string().min(2).max(80),
  depotAddress: z.string().min(3).max(160),
  timezone: z.string().min(1),
  name: z.string().min(1).max(80),
});

// First-run onboarding: creates the organization document, makes the
// caller its owner, and stamps the orgId custom claim on their auth token.
// This is the only place a brand-new user can become an "owner" — every
// other member arrives through an invite (see /api/invites).
export async function POST(req: NextRequest) {
  const rl = rateLimit(`org-create:${clientIp(req)}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { idToken, orgName, depotName, depotAddress, timezone, name } = parsed.data;

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken, true);
  } catch (err) {
    console.error("org/create token verification failed:", err);
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const uid = decoded.uid;
  const email = decoded.email ?? "";

  if (decoded.orgId) {
    return NextResponse.json({ error: "Account already belongs to an organization" }, { status: 409 });
  }

  try {
    const db = adminDb();
    const orgRef = db.collection("organizations").doc();
    const orgId = orgRef.id;
    const now = new Date().toISOString();

    const org: Organization = {
      id: orgId,
      name: orgName,
      depotName,
      depotAddress,
      timezone,
      units: "mi",
      depotLat: defaultDepotFor(timezone)?.lat ?? null,
      depotLng: defaultDepotFor(timezone)?.lng ?? null,
      logoUrl: null,
      planTier: "starter",
      createdAt: now,
      createdBy: uid,
      ownerId: uid,
    };

    const member: Member = {
      uid,
      orgId,
      email,
      name,
      role: "owner",
      status: "active",
      createdAt: now,
    };

    await db.runTransaction(async (tx) => {
      tx.set(orgRef, org);
      tx.set(db.doc(`organizations/${orgId}/members/${uid}`), member);
    });

    await adminAuth().setCustomUserClaims(uid, { orgId, role: "owner" });

    return NextResponse.json({ orgId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not create your organization right now" }, { status: 503 });
  }
}
