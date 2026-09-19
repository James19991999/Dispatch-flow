import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse, ApiError } from "@/lib/auth/api";
import { writeAuditLog, notifyOrg } from "@/lib/firestore/audit";
import type { Delivery, JourneyEvent } from "@/types/models";

const STATUS_LABEL: Record<string, string> = {
  pending: "Order confirmed",
  in_transit: "Out for delivery",
  delivered: "Recipient signed proof",
  delayed: "Marked delayed",
  exception: "Exception flagged",
};

const schema = z.object({
  status: z.enum(["pending", "in_transit", "delivered", "delayed", "exception"]).optional(),
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  eta: z.string().nullable().optional(),
  coldChainTempC: z.number().nullable().optional(),
  signedBy: z.string().nullable().optional(),
  proofOfDeliveryUrl: z.string().max(200000).nullable().optional(),
  note: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireApiSession("dispatcher");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.doc(`organizations/${session.org.id}/deliveries/${params.id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Delivery not found");
    const existing = snap.data() as Delivery;

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updatedAt: now };
    const { status, driverId, vehicleId, eta, coldChainTempC, signedBy, proofOfDeliveryUrl, note } = parsed.data;
    if (driverId !== undefined) update.driverId = driverId;
    if (vehicleId !== undefined) update.vehicleId = vehicleId;
    if (eta !== undefined) update.eta = eta;
    if (coldChainTempC !== undefined) update.coldChainTempC = coldChainTempC;
    if (signedBy !== undefined) update.signedBy = signedBy;
    if (proofOfDeliveryUrl !== undefined) update.proofOfDeliveryUrl = proofOfDeliveryUrl;

    let journey: JourneyEvent[] = existing.journey ?? [];
    if (status && status !== existing.status) {
      update.status = status;
      journey = [...journey, { label: STATUS_LABEL[status] ?? status, at: now, note }];
      update.journey = journey;
    } else if (note) {
      journey = [...journey, { label: note, at: now }];
      update.journey = journey;
    }

    await ref.update(update);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "delivery.update",
      targetType: "delivery",
      targetId: params.id,
      detail: status ? `Status → ${status}` : "Updated",
    });

    if (status === "delayed" || status === "exception") {
      await notifyOrg({
        orgId: session.org.id,
        kind: status === "delayed" ? "delay" : "exception",
        title: status === "delayed" ? `Delay on ${existing.trackingCode}` : `Exception on ${existing.trackingCode}`,
        body: note || `${existing.trackingCode} to ${existing.recipientName} needs attention.`,
        link: `/deliveries/${params.id}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
