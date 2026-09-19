import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import type { Invite, Member } from "@/types/models";

const schema = z.object({
  idToken: z.string().min(10),
  token: z.string().min(10),
  name: z.string().min(1).max(80),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`invite-accept:${clientIp(req)}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { idToken, token, name } = parsed.data;

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken, true);
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (decoded.orgId) {
    return NextResponse.json({ error: "Account already belongs to an organization" }, { status: 409 });
  }

  try {
    const db = adminDb();
    const inviteRef = db.doc(`invites/${token}`);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    const invite = inviteSnap.data() as Invite;

    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite already used or revoked" }, { status: 409 });
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }
    if (decoded.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      );
    }

    const uid = decoded.uid;
    const now = new Date().toISOString();
    const member: Member = {
      uid,
      orgId: invite.orgId,
      email: invite.email,
      name,
      role: invite.role,
      status: "active",
      createdAt: now,
      invitedBy: invite.invitedBy,
    };

    await db.runTransaction(async (tx) => {
      tx.set(db.doc(`organizations/${invite.orgId}/members/${uid}`), member);
      tx.update(inviteRef, { status: "accepted" });
    });

    await adminAuth().setCustomUserClaims(uid, { orgId: invite.orgId, role: invite.role });

    return NextResponse.json({ orgId: invite.orgId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not accept this invite right now" }, { status: 503 });
  }
}
