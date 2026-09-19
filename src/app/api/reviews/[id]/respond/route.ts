import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";

const schema = z.object({ message: z.string().min(1).max(500) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/reviews/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Review not found");

    // No SMS/email provider is wired in this build (see README) — the
    // response is recorded and shown in-app as delivered; wiring an actual
    // SMS/email send needs a provider choice, same as invite email.
    await ref.update({ status: "responded", response: parsed.data.message });

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "review.respond",
      targetType: "review",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
