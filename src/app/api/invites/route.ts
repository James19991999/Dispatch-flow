import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import type { Invite } from "@/types/models";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "dispatcher", "driver", "viewer"]),
});

const INVITE_TTL_DAYS = 7;

// List pending invites for the org.
export async function GET() {
  try {
    const session = await requireApiSession("admin");
    const db = adminDb();
    const snap = await db
      .collection("invites")
      .where("orgId", "==", session.org.id)
      .where("status", "==", "pending")
      .get();
    return NextResponse.json({ invites: snap.docs.map((d) => d.data()) });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession("admin");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const db = adminDb();
    const existingMember = await db
      .collection(`organizations/${session.org.id}/members`)
      .where("email", "==", parsed.data.email)
      .limit(1)
      .get();
    if (!existingMember.empty) {
      return NextResponse.json({ error: "Already a member of this organization" }, { status: 409 });
    }

    const token = randomUUID();
    const now = new Date();
    const invite: Invite = {
      id: token,
      orgId: session.org.id,
      orgName: session.org.name,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: session.uid,
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 86400000).toISOString(),
    };
    await db.doc(`invites/${token}`).set(invite);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "invite.create",
      targetType: "invite",
      targetId: token,
      detail: `Invited ${parsed.data.email} as ${parsed.data.role}`,
    });

    // No email provider is wired in this build — the invite link is
    // returned directly so it can be shared manually (Settings > Team also
    // surfaces it with a copy-link button). Wiring transactional email is a
    // deliberate scope call: it needs a provider choice (Resend/SendGrid/
    // SES) and a "from" domain the org owns, which is a business decision,
    // not a default I should guess.
    return NextResponse.json({
      invite,
      link: `/invite/${token}`,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
