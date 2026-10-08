import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { writeAuditLog } from "@/lib/firestore/audit";
import type { Delivery } from "@/types/models";

export const dynamic = "force-dynamic";

function toCsvRow(fields: (string | number)[]): string {
  return fields
    .map((f) => {
      const s = String(f);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

// Exports a CSV of the org's deliveries for accounting/payroll reconciliation.
// A SHA-256 hash of the exact bytes returned is computed and recorded on the
// audit log entry, so a later dispute about "was this file altered after
// export" has a real, independently-checkable answer — not just a label
// that says "signed" with nothing behind it. It is a content-integrity hash,
// not a cryptographic signature with a verifiable signer identity; wiring a
// real signing key is a further step if that distinction matters for your
// compliance needs.
export async function GET(req: NextRequest) {
  try {
    const session = await requireApiSession("dispatcher");
    const db = adminDb();
    const snap = await db.collection(`organizations/${session.org.id}/deliveries`).get();
    const deliveries = snap.docs.map((d) => d.data() as Delivery);

    const header = toCsvRow([
      "Tracking Code",
      "Recipient",
      "Destination",
      "Status",
      "Priority",
      "Parcels",
      "Driver ID",
      "Created At",
      "Updated At",
    ]);
    const rows = deliveries.map((d) =>
      toCsvRow([
        d.trackingCode,
        d.recipientName,
        d.destinationAddress,
        d.status,
        d.priority,
        d.parcelCount,
        d.driverId ?? "",
        d.createdAt,
        d.updatedAt,
      ])
    );
    const csv = [header, ...rows].join("\n");
    const hash = createHash("sha256").update(csv).digest("hex");

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "report.export",
      targetType: "report",
      targetId: `export-${Date.now()}`,
      detail: `${deliveries.length} rows · sha256:${hash}`,
    });

    const format = req.nextUrl.searchParams.get("format");
    if (format === "json") {
      return NextResponse.json({ csv, sha256: hash, rowCount: deliveries.length });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dispatchflow-export-${session.org.id}.csv"`,
        "X-Content-SHA256": hash,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
