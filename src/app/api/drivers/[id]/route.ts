import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  status: z.enum(["on_road", "available", "off_duty"]).optional(),
  vehicleId: z.string().nullable().optional(),
  licenseExpiry: z.string().nullable().optional(),
  lastKnownPosition: z
    .object({ lat: z.number(), lng: z.number(), heading: z.number().optional(), speedKph: z.number().optional() })
    .nullable()
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/drivers/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Driver not found");

    const update: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.lastKnownPosition !== undefined) {
      update.lastPingAt = new Date().toISOString();
    }
    await ref.update(update);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "driver.update",
      targetType: "driver",
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
    const ref = db.doc(`organizations/${session.org.id}/drivers/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Driver not found");
    await ref.delete();

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "driver.delete",
      targetType: "driver",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
