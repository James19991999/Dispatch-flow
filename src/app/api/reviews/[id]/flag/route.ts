import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog, notifyOrg } from "@/lib/firestore/audit";
import type { Review } from "@/types/models";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/reviews/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Review not found");
    const review = snap.data() as Review;

    await ref.update({ status: "flagged" });

    await notifyOrg({
      orgId: session.org.id,
      kind: "new_review",
      title: "Review flagged for follow-up",
      body: `${review.recipientName}'s ${review.rating}★ review needs dispatch attention.`,
      link: `/feedback`,
    });

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "review.flag",
      targetType: "review",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
