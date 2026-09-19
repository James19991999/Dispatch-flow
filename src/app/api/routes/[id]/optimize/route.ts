import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import { optimizeStopOrder, estimateSavings } from "@/lib/routeOptimizer";
import type { Delivery, Route } from "@/types/models";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const { depotLat, depotLng } = session.org;
    if (typeof depotLat !== "number" || typeof depotLng !== "number") {
      throw new ApiError(400, "Set your depot coordinates in Settings before optimizing routes");
    }

    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/routes/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Route not found");
    const route = snap.data() as Route;

    const deliverySnaps = await Promise.all(
      route.stops.map((s) => db.doc(`organizations/${session.org.id}/deliveries/${s.deliveryId}`).get())
    );
    const deliveries = deliverySnaps.filter((s) => s.exists).map((s) => s.data() as Delivery);

    const { orderedIds, kmBefore, kmAfter } = optimizeStopOrder(
      { lat: depotLat, lng: depotLng },
      deliveries,
      { medicalColdChainFirst: route.constraints.medicalColdChainFirst }
    );
    const savings = estimateSavings(kmBefore, kmAfter);

    const byDeliveryId = new Map(route.stops.map((s) => [s.deliveryId, s]));
    const newStops = orderedIds
      .map((id, i) => {
        const stop = byDeliveryId.get(id);
        return stop ? { ...stop, sequence: i } : null;
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    await ref.update({
      stops: newStops,
      status: "optimized",
      estMilesSaved: savings.milesSaved,
      estMinutesSaved: savings.minutesSaved,
      estFuelSavedGal: savings.fuelSavedGal,
      updatedAt: new Date().toISOString(),
    });

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "route.optimize",
      targetType: "route",
      targetId: params.id,
      detail: `${savings.milesSaved} mi / ${savings.minutesSaved} min saved`,
    });

    return NextResponse.json({ savings, stops: newStops });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
