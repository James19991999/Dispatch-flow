import { NextResponse } from "next/server";
import { adminAuth, readServiceAccountJson } from "@/lib/firebase/admin";

// TEMPORARY diagnostic route — delete after the Firebase Admin setup is
// confirmed working. Reports only booleans, counts and Google's own error
// text; never echoes secret values.
export const dynamic = "force-dynamic";

function describeKey(raw: string) {
  const m = raw.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  const bodyRaw = m ? m[1] : raw;
  const body = bodyRaw.replace(/\\n|\\r|\s/g, "");
  return {
    rawLength: raw.length,
    literalBackslashN: (raw.match(/\\n/g) ?? []).length,
    realNewlines: (raw.match(/\n/g) ?? []).length,
    bodyLength: body.length,
    bodyLengthMod4: body.length % 4,
    bodyNonBase64Chars: (body.match(/[^A-Za-z0-9+/=]/g) ?? []).length,
    bodyEndsWithPadding: /=*$/.test(body),
  };
}

export async function GET() {
  const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? "";
  const splitKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const serverProject = process.env.FIREBASE_PROJECT_ID ?? "";
  const publicProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";

  const checks = {
    hasServiceAccountJson: Boolean(serviceJson),
    hasServerProjectId: Boolean(serverProject),
    hasPublicProjectId: Boolean(publicProject),
    projectIdsMatch: Boolean(serverProject) && serverProject === publicProject,
    hasClientEmail: Boolean(clientEmail),
    clientEmailLooksLikeServiceAccount: clientEmail.endsWith(".iam.gserviceaccount.com"),
    hasPrivateKey: Boolean(splitKey),
  };

  let jsonDetails: Record<string, unknown> | null = null;
  if (serviceJson) {
    try {
      const text = serviceJson.trim();
      const decoded = text.startsWith("{") ? text : Buffer.from(text, "base64").toString("utf8");
      const rawParsed = JSON.parse(decoded) as Record<string, unknown>;
      const cleaned = readServiceAccountJson(serviceJson);
      jsonDetails = {
        jsonParses: true,
        projectIdInJson: rawParsed.project_id === publicProject,
        clientEmailInJsonIsServiceAccount:
          typeof rawParsed.client_email === "string" && rawParsed.client_email.endsWith(".iam.gserviceaccount.com"),
        privateKeyIsString: typeof rawParsed.private_key === "string",
        rawKey: typeof rawParsed.private_key === "string" ? describeKey(rawParsed.private_key) : null,
        cleanedKey: typeof cleaned.private_key === "string" ? describeKey(cleaned.private_key) : null,
      };
    } catch (err) {
      jsonDetails = { jsonParses: false, error: ((err as Error).message ?? "").slice(0, 200) };
    }
  }

  let adminCall: { ok: boolean; code?: string; message?: string };
  try {
    await adminAuth().listUsers(1);
    adminCall = { ok: true };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    adminCall = { ok: false, code: e.code, message: (e.message ?? String(err)).slice(0, 400) };
  }

  return NextResponse.json({ checks, jsonDetails, splitKey: splitKey ? describeKey(splitKey) : null, adminCall });
}
