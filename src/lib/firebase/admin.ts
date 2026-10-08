import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only. Never import this from a "use client" file.
// Credentials come from either:
//  - FIREBASE_SERVICE_ACCOUNT_KEY: a full JSON service-account key (stringified), or
//  - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY split vars
// On Vercel + Firebase this is normally the latter, set as project env vars.
// Rebuilds a clean PEM from whatever the env var mangled it into: wrapping
// quotes, literal "\n" sequences, CRLFs, stray spaces or re-wrapped lines.
export function normalizePrivateKey(raw: string): string {
  let s = raw.trim();
  if (s.length > 1 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  s = s.replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");
  const m = s.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  if (!m) return s;
  const body = m[1].replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

// Accepts raw JSON or the same JSON base64-encoded.
export function readServiceAccountJson(value: string): Record<string, unknown> {
  const text = value.trim();
  const json = text.startsWith("{") ? text : Buffer.from(text, "base64").toString("utf8");
  const parsed = JSON.parse(json) as Record<string, unknown>;
  if (typeof parsed.private_key === "string") {
    parsed.private_key = normalizePrivateKey(parsed.private_key);
  }
  return parsed;
}

function buildAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    return initializeApp({ credential: cert(readServiceAccountJson(serviceAccountJson) as never) });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
    : undefined;

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  // No credentials available (e.g. local build without env vars, or CI).
  // Defer the throw until something actually tries to use the SDK, so
  // `next build` and non-Firebase routes/tests don't fail just from importing
  // this module.
  return initializeApp({ projectId: projectId ?? "dispatchflow-unconfigured" });
}

let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;

export function adminAuth(): Auth {
  if (!_adminAuth) _adminAuth = getAuth(buildAdminApp());
  return _adminAuth;
}

export function adminDb(): Firestore {
  if (!_adminDb) {
    const db = getFirestore(buildAdminApp());
    // Many API routes build documents from optional form fields (weightKg,
    // email, a journey note...). Without this, Firestore throws on any
    // `undefined` value and the route returns a 500. settings() may only be
    // called once per instance, so tolerate a repeat call (hot reload).
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* already configured */
    }
    _adminDb = db;
  }
  return _adminDb;
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY)
  );
}
