import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import { canRemoveMember } from "@/lib/auth/roles";
import type { Member } from "@/types/models";

const patchSchema = z.object({
  role: z.enum(["admin", "dispatcher", "driver", "viewer"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const session = await requireApiSession("admin");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/members/${params.uid}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Member not found");
    const target = snap.data() as Member;
    if (target.role === "owner") throw new ApiError(400, "The owner's role can't be changed — no ownership-transfer flow exists yet");

    await ref.update({ role: parsed.data.role });
    await adminAuth().setCustomUserClaims(params.uid, { orgId: session.org.id, role: parsed.data.role });

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "member.role_change",
      targetType: "member",
      targetId: params.uid,
      detail: `${target.name} → ${parsed.data.role}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

// Rules, not just a spec checklist: the owner can never be removed (there is
// no ownership-transfer flow, so it would orphan the org) and nobody can
// remove themselves (that's a "leave org" action, deliberately not built —
// it needs its own confirmation flow and isn't the same as an admin
// removing someone else).
export async function DELETE(_req: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const session = await requireApiSession("admin");
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/members/${params.uid}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Member not found");
    const target = snap.data() as Member;

    const allowed = canRemoveMember(
      session.member.role,
      target.role,
      params.uid === session.uid,
      target.role === "owner"
    );
    if (!allowed) throw new ApiError(403, "This member can't be removed");

    await ref.update({ status: "disabled" });
    await adminAuth().setCustomUserClaims(params.uid, {});

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "member.remove",
      targetType: "member",
      targetId: params.uid,
      detail: `Removed ${target.name}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
