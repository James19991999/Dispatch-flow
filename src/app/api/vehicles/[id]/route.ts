import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";

const schema = z.object({
  label: z.string().min(1).max(40).optional(),
  plate: z.string().min(2).max(20).optional(),
  type: z.enum(["van", "truck", "motorbike", "ev"]).optional(),
  status: z.enum(["active", "maintenance", "idle"]).optional(),
  fuelOrChargePct: z.number().min(0).max(100).nullable().optional(),
  assignedDriverId: z.string().nullable().optional(),
  insuranceExpiry: z.string().nullable().optional(),
  maintenanceDueAt: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/vehicles/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Vehicle not found");
    await ref.update(parsed.data);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "vehicle.update",
      targetType: "vehicle",
      targetId: params.id,
      detail: Object.keys(parsed.data).join(", "),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("admin");
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/vehicles/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Vehicle not found");
    await ref.delete();

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "vehicle.delete",
      targetType: "vehicle",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
