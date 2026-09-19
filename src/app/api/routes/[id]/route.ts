import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog, notifyOrg } from "@/lib/firestore/audit";
import type { Route, RouteStop } from "@/types/models";

const schema = z.object({
  stopOrder: z.array(z.string()).optional(), // array of stop ids in new order
  completeStopId: z.string().optional(),
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  status: z.enum(["draft", "optimized", "active", "completed"]).optional(),
  send: z.boolean().optional(), // marks as sent/active + notifies
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/routes/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Route not found");
    const route = snap.data() as Route;

    let stops = route.stops;
    if (parsed.data.stopOrder) {
      const byId = new Map(stops.map((s) => [s.id, s]));
      stops = parsed.data.stopOrder
        .map((id, i) => {
          const s = byId.get(id);
          return s ? { ...s, sequence: i } : null;
        })
        .filter((s): s is RouteStop => Boolean(s));
    }
    if (parsed.data.completeStopId) {
      stops = stops.map((s) => (s.id === parsed.data.completeStopId ? { ...s, status: "completed" as const } : s));
    }

    const update: Record<string, unknown> = { stops, updatedAt: new Date().toISOString() };
    if (parsed.data.driverId !== undefined) update.driverId = parsed.data.driverId;
    if (parsed.data.vehicleId !== undefined) update.vehicleId = parsed.data.vehicleId;
    if (parsed.data.status) update.status = parsed.data.status;
    if (parsed.data.send) update.status = "active";

    await ref.update(update);

    if (parsed.data.send) {
      await notifyOrg({
        orgId: session.org.id,
        kind: "route_change",
        title: `Route transmitted: ${route.name}`,
        body: `Sent to ${route.driverId ? "assigned driver" : "driver app"} — ${stops.length} stops.`,
        link: `/routes/${params.id}`,
      });
    }

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: parsed.data.send ? "route.send" : "route.update",
      targetType: "route",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
