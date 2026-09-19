"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";

export async function establishSessionCookie(): Promise<void> {
  const user = clientAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not start session");
  }
}

export async function signInWithPassword(email: string, password: string) {
  await signInWithEmailAndPassword(clientAuth(), email, password);
  await establishSessionCookie();
}

export async function signUpWithPassword(email: string, password: string) {
  await createUserWithEmailAndPassword(clientAuth(), email, password);
  // Session cookie is established after onboarding/invite acceptance sets
  // the orgId claim — see the onboarding and invite-accept pages.
}

export async function sendReset(email: string) {
  await sendPasswordResetEmail(clientAuth(), email);
}

export async function signOutEverywhere() {
  await fetch("/api/auth/session", { method: "DELETE" });
  await fbSignOut(clientAuth());
}
