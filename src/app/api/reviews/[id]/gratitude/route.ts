import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/reviews/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Review not found");

    await ref.update({ status: "responded", response: "Thank you for the kind words — we shared this with the driver!" });

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "review.gratitude",
      targetType: "review",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
