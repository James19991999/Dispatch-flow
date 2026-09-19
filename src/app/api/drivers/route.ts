import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import type { Driver } from "@/types/models";

const schema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  vehicleId: z.string().optional().nullable(),
  licenseExpiry: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.collection(`organizations/${session.org.id}/drivers`).doc();
    const driver: Driver = {
      id: ref.id,
      orgId: session.org.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      status: "available",
      rating: 5,
      vehicleId: parsed.data.vehicleId || null,
      licenseExpiry: parsed.data.licenseExpiry || null,
      lastKnownPosition: null,
      lastPingAt: null,
      createdAt: new Date().toISOString(),
    };
    await ref.set(driver);

    if (parsed.data.vehicleId) {
      await db.doc(`organizations/${session.org.id}/vehicles/${parsed.data.vehicleId}`).update({
        assignedDriverId: ref.id,
      });
    }

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "driver.create",
      targetType: "driver",
      targetId: ref.id,
      detail: `Added driver ${driver.name}`,
    });

    return NextResponse.json({ driver });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
