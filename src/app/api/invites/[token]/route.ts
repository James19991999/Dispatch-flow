import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import type { Invite } from "@/types/models";

// Public lookup — a person clicking an invite link isn't signed in yet, so
// this intentionally returns only the non-sensitive fields needed to render
// the "You're invited to <org>" screen, never the full invite document.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const rl = rateLimit(`invite-lookup:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  try {
    const snap = await adminDb().doc(`invites/${params.token}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    const invite = snap.data() as Invite;
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite already used or revoked" }, { status: 409 });
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }
    return NextResponse.json({
      orgName: invite.orgName,
      email: invite.email,
      role: invite.role,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not look up this invite right now" }, { status: 503 });
  }
}
