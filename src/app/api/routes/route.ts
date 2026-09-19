import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import type { Delivery, Route, RouteStop } from "@/types/models";

const schema = z.object({
  name: z.string().min(2).max(80),
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  deliveryIds: z.array(z.string()).min(1).max(30),
  constraints: z
    .object({
      medicalColdChainFirst: z.boolean().default(true),
      strictTimeWindows: z.boolean().default(false),
      minimizeLeftTurns: z.boolean().default(false),
      timeWindowToleranceMin: z.number().min(0).max(120).default(15),
    })
    .default({
      medicalColdChainFirst: true,
      strictTimeWindows: false,
      minimizeLeftTurns: false,
      timeWindowToleranceMin: 15,
    }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const deliverySnaps = await Promise.all(
      parsed.data.deliveryIds.map((id) => db.doc(`organizations/${session.org.id}/deliveries/${id}`).get())
    );
    const deliveries = deliverySnaps.filter((s) => s.exists).map((s) => s.data() as Delivery);
    if (deliveries.length === 0) {
      return NextResponse.json({ error: "No valid deliveries selected" }, { status: 400 });
    }

    const stops: RouteStop[] = deliveries.map((d, i) => ({
      id: d.id,
      deliveryId: d.id,
      sequence: i,
      address: d.destinationAddress,
      label: d.recipientName,
      status: "pending",
    }));

    const ref = db.collection(`organizations/${session.org.id}/routes`).doc();
    const now = new Date().toISOString();
    const route: Route = {
      id: ref.id,
      orgId: session.org.id,
      name: parsed.data.name,
      driverId: parsed.data.driverId || null,
      vehicleId: parsed.data.vehicleId || null,
      status: "draft",
      stops,
      constraints: parsed.data.constraints,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(route);

    await Promise.all(
      deliveries.map((d) => db.doc(`organizations/${session.org.id}/deliveries/${d.id}`).update({ routeId: ref.id }))
    );

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "route.create",
      targetType: "route",
      targetId: ref.id,
      detail: `${route.name} · ${stops.length} stops`,
    });

    return NextResponse.json({ route });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
