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
function buildAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);
    return initializeApp({ credential: cert(parsed) });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
  if (!_adminDb) _adminDb = getFirestore(buildAdminApp());
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
