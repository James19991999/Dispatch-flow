import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  depotName: z.string().min(2).max(80).optional(),
  depotAddress: z.string().min(3).max(160).optional(),
  depotLat: z.number().min(-90).max(90).nullable().optional(),
  depotLng: z.number().min(-180).max(180).nullable().optional(),
  timezone: z.string().optional(),
  units: z.enum(["mi", "km"]).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireApiSession("admin");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await adminDb().doc(`organizations/${session.org.id}`).update(parsed.data);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "org.update",
      targetType: "organization",
      targetId: session.org.id,
      detail: Object.keys(parsed.data).join(", "),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
