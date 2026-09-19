import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";

// Bulk mark-all-read. Individual toggles happen directly via the client SDK
// (allowed by firestore.rules for the caller's own notifications) — this
// exists because a batched write is meaningfully cheaper than N individual
// client writes when clearing a long list.
export async function PATCH() {
  try {
    const session = await requireApiSession("viewer");
    const db = adminDb();
    const snap = await db
      .collection(`organizations/${session.org.id}/notifications`)
      .where("read", "==", false)
      .get();

    const relevant = snap.docs.filter((d) => {
      const targetUid = d.data().targetUid;
      return targetUid == null || targetUid === session.uid;
    });
    if (relevant.length === 0) return NextResponse.json({ ok: true, count: 0 });

    const batch = db.batch();
    relevant.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();

    return NextResponse.json({ ok: true, count: relevant.length });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
