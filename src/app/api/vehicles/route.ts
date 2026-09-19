import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import type { Vehicle } from "@/types/models";

const schema = z.object({
  label: z.string().min(1).max(40),
  plate: z.string().min(2).max(20),
  type: z.enum(["van", "truck", "motorbike", "ev"]),
  insuranceExpiry: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.collection(`organizations/${session.org.id}/vehicles`).doc();
    const vehicle: Vehicle = {
      id: ref.id,
      orgId: session.org.id,
      label: parsed.data.label,
      plate: parsed.data.plate,
      type: parsed.data.type,
      status: "idle",
      fuelOrChargePct: 100,
      insuranceExpiry: parsed.data.insuranceExpiry || null,
      maintenanceDueAt: null,
      assignedDriverId: null,
      createdAt: new Date().toISOString(),
    };
    await ref.set(vehicle);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "vehicle.create",
      targetType: "vehicle",
      targetId: ref.id,
      detail: `Added vehicle ${vehicle.label}`,
    });

    return NextResponse.json({ vehicle });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
