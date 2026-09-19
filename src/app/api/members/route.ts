import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";

export async function GET() {
  try {
    const session = await requireApiSession("viewer");
    const snap = await adminDb().collection(`organizations/${session.org.id}/members`).get();
    return NextResponse.json({ members: snap.docs.map((d) => d.data()) });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
