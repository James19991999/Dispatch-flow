import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import { offsetFromDepot } from "@/lib/geo";
import type { Driver, Vehicle, Delivery, Review } from "@/types/models";

// Owner/admin-triggered demo-data seed for a brand-new organization, so the
// product is explorable immediately after onboarding instead of showing
// seven empty screens. Guarded by org.seeded so it can only run once per
// org — this is sample data for evaluation, not a fixture meant to be
// re-run in a live production org.
export async function POST() {
  try {
    const session = await requireApiSession("admin");
    if (session.org.seeded) {
      throw new ApiError(409, "This organization already has data — seed only runs once");
    }
    const db = adminDb();
    const orgId = session.org.id;
    const now = new Date().toISOString();
    const depotLat = session.org.depotLat ?? -1.2921;
    const depotLng = session.org.depotLng ?? 36.8219;

    const batch = db.batch();

    if (session.org.depotLat == null) {
      batch.update(db.doc(`organizations/${orgId}`), { depotLat, depotLng });
    }

    const vehicleDefs: Omit<Vehicle, "id" | "orgId" | "createdAt">[] = [
      { label: "Van-04", plate: "KDA 214B", type: "van", status: "active", fuelOrChargePct: 82, assignedDriverId: null, insuranceExpiry: null, maintenanceDueAt: null },
      { label: "Van-09", plate: "KDB 552F", type: "van", status: "active", fuelOrChargePct: 61, assignedDriverId: null, insuranceExpiry: null, maintenanceDueAt: null },
      { label: "EV-98", plate: "KDC 901E", type: "ev", status: "active", fuelOrChargePct: 88, assignedDriverId: null, insuranceExpiry: null, maintenanceDueAt: null },
      { label: "Van-14", plate: "KDD 330C", type: "van", status: "idle", fuelOrChargePct: 45, assignedDriverId: null, insuranceExpiry: null, maintenanceDueAt: null },
    ];
    const vehicleRefs = vehicleDefs.map(() => db.collection(`organizations/${orgId}/vehicles`).doc());
    vehicleDefs.forEach((v, i) => {
      const vehicle: Vehicle = { ...v, id: vehicleRefs[i].id, orgId, createdAt: now };
      batch.set(vehicleRefs[i], vehicle);
    });

    const driverDefs = [
      { name: "Elena Rostova", phone: "+254 700 111 222", status: "on_road" as const, rating: 4.9, vehicleIdx: 0 },
      { name: "Marcus Vance", phone: "+254 700 222 333", status: "on_road" as const, rating: 4.8, vehicleIdx: 1 },
      { name: "Marcus Cooper", phone: "+254 700 333 444", status: "on_road" as const, rating: 4.9, vehicleIdx: 2 },
      { name: "Sara Kimani", phone: "+254 700 444 555", status: "available" as const, rating: 4.7, vehicleIdx: 3 },
    ];
    const driverRefs = driverDefs.map(() => db.collection(`organizations/${orgId}/drivers`).doc());
    driverDefs.forEach((d, i) => {
      const pos = offsetFromDepot(depotLat, depotLng, d.name, 0.03);
      const driver: Driver = {
        id: driverRefs[i].id,
        orgId,
        name: d.name,
        phone: d.phone,
        status: d.status,
        rating: d.rating,
        vehicleId: vehicleRefs[d.vehicleIdx].id,
        licenseExpiry: null,
        lastKnownPosition: { lat: pos.lat, lng: pos.lng, heading: Math.random() * 360, speedKph: 28 + Math.random() * 20 },
        lastPingAt: now,
        createdAt: now,
      };
      batch.set(driverRefs[i], driver);
      batch.update(vehicleRefs[i], { assignedDriverId: driverRefs[i].id });
    });

    const deliveryDefs: Array<{
      recipient: string;
      address: string;
      status: Delivery["status"];
      priority: Delivery["priority"];
      driverIdx: number | null;
      coldTemp?: number;
    }> = [
      { recipient: "Dr. Aris Thorne", address: "Memorial Clinic, Uhuru Highway", status: "in_transit", priority: "cold_chain", driverIdx: 0, coldTemp: 3.8 },
      { recipient: "Marcus Chen", address: "742 Evergreen Terrace", status: "in_transit", priority: "priority", driverIdx: 2 },
      { recipient: "Fresh Bake Cafe", address: "Westlake Center, Nairobi", status: "delivered", priority: "standard", driverIdx: 1 },
      { recipient: "TechZone", address: "Sarit Centre, Westlands", status: "delivered", priority: "standard", driverIdx: 1 },
      { recipient: "Highland Retail Park", address: "Highland Rd", status: "pending", priority: "standard", driverIdx: null },
      { recipient: "Dr. Eleanor Vance", address: "Memorial Clinic, Wing B", status: "delayed", priority: "medical", driverIdx: 3 },
      { recipient: "David K.", address: "442 Northway Ave", status: "exception", priority: "standard", driverIdx: null },
    ];
    const deliveryRefs = deliveryDefs.map(() => db.collection(`organizations/${orgId}/deliveries`).doc());
    deliveryDefs.forEach((d, i) => {
      const pos = offsetFromDepot(depotLat, depotLng, d.address);
      const delivery: Delivery = {
        id: deliveryRefs[i].id,
        orgId,
        trackingCode: `DF-${9010 + i}`,
        recipientName: d.recipient,
        destinationAddress: d.address,
        lat: pos.lat,
        lng: pos.lng,
        status: d.status,
        priority: d.priority,
        parcelCount: 1 + (i % 3),
        driverId: d.driverIdx != null ? driverRefs[d.driverIdx].id : null,
        vehicleId: d.driverIdx != null ? vehicleRefs[d.driverIdx].id : null,
        routeId: null,
        eta: d.status === "in_transit" ? new Date(Date.now() + 25 * 60000).toISOString() : null,
        coldChainTempC: d.coldTemp ?? null,
        signedBy: d.status === "delivered" ? "R. Miller" : null,
        proofOfDeliveryUrl: null,
        journey: [
          { label: "Automated electronic manifest created", at: now },
          ...(d.status !== "pending" ? [{ label: "Loaded at Central Hub", at: now }] : []),
          ...(d.status === "delivered" ? [{ label: "Recipient signed proof", at: now }] : []),
          ...(d.status === "delayed" ? [{ label: "Marked delayed — traffic", at: now }] : []),
          ...(d.status === "exception" ? [{ label: "Exception flagged", at: now }] : []),
        ],
        createdAt: now,
        updatedAt: now,
        createdBy: session.uid,
      };
      batch.set(deliveryRefs[i], delivery);
    });

    const reviewDefs: Array<{ recipient: string; rating: number; comment: string; driverIdx: number; status: Review["status"] }> = [
      { recipient: "Sarah Jenkins", rating: 5, comment: "Driver called ahead and was right on time. Cold-chain seal was intact.", driverIdx: 0, status: "unreplied" },
      { recipient: "David K.", rating: 2, comment: "Package arrived an hour later than the tracking page said.", driverIdx: 1, status: "unreplied" },
      { recipient: "Dr. Eleanor Vance", rating: 5, comment: "Consistently reliable for our clinic deliveries.", driverIdx: 3, status: "unreplied" },
    ];
    const reviewRefs = reviewDefs.map(() => db.collection(`organizations/${orgId}/reviews`).doc());
    reviewDefs.forEach((r, i) => {
      const review: Review = {
        id: reviewRefs[i].id,
        orgId,
        deliveryId: deliveryRefs[i]?.id ?? null,
        driverId: driverRefs[r.driverIdx].id,
        recipientName: r.recipient,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        response: null,
        createdAt: now,
      };
      batch.set(reviewRefs[i], review);
    });

    batch.update(db.doc(`organizations/${orgId}`), { seeded: true });

    await batch.commit();

    await writeAuditLog({
      orgId,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "org.seed_demo_data",
      targetType: "organization",
      targetId: orgId,
      detail: `${driverDefs.length} drivers, ${vehicleDefs.length} vehicles, ${deliveryDefs.length} deliveries, ${reviewDefs.length} reviews`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
