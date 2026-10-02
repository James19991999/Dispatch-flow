import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

// TEMPORARY diagnostic route — delete after the Firebase Admin setup is
// confirmed working. Reports only booleans and Google's own error text; never
// echoes secret values.
export const dynamic = "force-dynamic";

export async function GET() {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const key = rawKey.replace(/\\n/g, "\n");
  const serverProject = process.env.FIREBASE_PROJECT_ID ?? "";
  const publicProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";

  const checks = {
    hasServiceAccountJson: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
    hasServerProjectId: Boolean(serverProject),
    hasPublicProjectId: Boolean(publicProject),
    projectIdsMatch: Boolean(serverProject) && serverProject === publicProject,
    hasClientEmail: Boolean(clientEmail),
    clientEmailLooksLikeServiceAccount: clientEmail.endsWith(".iam.gserviceaccount.com"),
    hasPrivateKey: Boolean(rawKey),
    privateKeyStartsCorrectly: key.trim().startsWith("-----BEGIN PRIVATE KEY-----"),
    privateKeyEndsCorrectly: key.trim().endsWith("-----END PRIVATE KEY-----"),
    privateKeyHasLineBreaks: key.includes("\n"),
    privateKeyWrappedInQuotes: rawKey.trim().startsWith('"') || rawKey.trim().endsWith('"'),
  };

  let adminCall: { ok: boolean; code?: string; message?: string };
  try {
    // Needs a valid service-account credential and a reachable Auth backend,
    // which is exactly what verifyIdToken(token, true) needs too.
    await adminAuth().listUsers(1);
    adminCall = { ok: true };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    adminCall = { ok: false, code: e.code, message: (e.message ?? String(err)).slice(0, 400) };
  }

  return NextResponse.json({ checks, adminCall });
}
