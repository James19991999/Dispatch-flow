import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { writeAuditLog, notifyOrg } from "@/lib/firestore/audit";
import { offsetFromDepot } from "@/lib/geo";
import { geocodeAddress } from "@/lib/geocode";
import type { Delivery } from "@/types/models";

const schema = z.object({
  recipientName: z.string().min(2).max(80),
  destinationAddress: z.string().min(3).max(160),
  priority: z.enum(["standard", "priority", "cold_chain", "medical"]).default("standard"),
  parcelCount: z.number().int().min(1).max(999).default(1),
  weightKg: z.number().min(0).optional(),
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  eta: z.string().optional().nullable(),
});

function nextTrackingCode(seq: number) {
  return `DF-${9000 + seq}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const colRef = db.collection(`organizations/${session.org.id}/deliveries`);
    const countSnap = await colRef.count().get();
    const ref = colRef.doc();
    const now = new Date().toISOString();

    const { depotLat, depotLng } = session.org;
    const depot =
      typeof depotLat === "number" && typeof depotLng === "number" ? { lat: depotLat, lng: depotLng } : null;
    // Real lookup first; fall back to a depot offset so the delivery still maps.
    const coords =
      (await geocodeAddress(parsed.data.destinationAddress, depot)) ??
      (depot ? offsetFromDepot(depot.lat, depot.lng, parsed.data.destinationAddress) : null);

    const delivery: Delivery = {
      id: ref.id,
      orgId: session.org.id,
      trackingCode: nextTrackingCode(countSnap.data().count),
      recipientName: parsed.data.recipientName,
      destinationAddress: parsed.data.destinationAddress,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      status: "pending",
      priority: parsed.data.priority,
      weightKg: parsed.data.weightKg,
      parcelCount: parsed.data.parcelCount,
      driverId: parsed.data.driverId || null,
      vehicleId: parsed.data.vehicleId || null,
      routeId: null,
      eta: parsed.data.eta || null,
      coldChainTempC: parsed.data.priority === "cold_chain" ? 3.8 : null,
      signedBy: null,
      proofOfDeliveryUrl: null,
      journey: [{ label: "Dispatch manifest created", at: now }],
      createdAt: now,
      updatedAt: now,
      createdBy: session.uid,
    };
    await ref.set(delivery);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "delivery.create",
      targetType: "delivery",
      targetId: ref.id,
      detail: `Created ${delivery.trackingCode} for ${delivery.recipientName}`,
    });
    await notifyOrg({
      orgId: session.org.id,
      kind: "system",
      title: "New dispatch created",
      body: `${delivery.trackingCode} manifest initialized for ${delivery.recipientName}.`,
      link: `/deliveries/${ref.id}`,
    });

    return NextResponse.json({ delivery });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
