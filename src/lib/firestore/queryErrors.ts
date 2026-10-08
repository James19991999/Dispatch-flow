"use client";

// Live Firestore listeners used to fail silently: a permissions or
// missing-database error just left every screen looking empty. Failures are
// now collected here and surfaced by <QueryErrorBanner />.
import { useSyncExternalStore } from "react";

let current: string | null = null;
const listeners = new Set<() => void>();

export function reportQueryError(message: string) {
  console.error("Firestore query failed:", message);
  if (current === message) return;
  current = message;
  listeners.forEach((l) => l());
}

export function clearQueryError() {
  if (current === null) return;
  current = null;
  listeners.forEach((l) => l());
}

export function describeQueryError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("permission") || m.includes("insufficient")) {
    return "Your data can't be read yet: the Firestore security rules haven't been deployed (or you need to sign out and in again).";
  }
  if (m.includes("index")) {
    return "A Firestore index is still building or missing. Deploy firestore.indexes.json and retry in a few minutes.";
  }
  if (m.includes("not-found") || m.includes("not found") || m.includes("database")) {
    return "The Firestore database doesn't exist yet. Create it in the Firebase console (Native mode).";
  }
  return message;
}

export function useQueryError(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null
  );
}
