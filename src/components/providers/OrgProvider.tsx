"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { clientAuth, clientDb } from "@/lib/firebase/client";
import { signOutEverywhere } from "@/lib/auth/client";
import { reportQueryError } from "@/lib/firestore/queryErrors";
import type { Member, Organization } from "@/types/models";

interface OrgContextValue {
  uid: string;
  org: Organization;
  member: Member;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}

/**
 * Hydrates from the server-verified session (passed as props from the
 * authenticated layout's server component) and then keeps `member` (role,
 * status) live via Firestore, so a role change or deactivation by an admin
 * takes effect for an already-open tab without a reload.
 */
export function OrgProvider({
  uid,
  initialOrg,
  initialMember,
  children,
}: {
  uid: string;
  initialOrg: Organization;
  initialMember: Member;
  children: ReactNode;
}) {
  const [member, setMember] = useState<Member>(initialMember);
  const router = useRouter();

  // The server trusts the session cookie, but Firestore security rules trust the
  // browser's Firebase Auth user. If those disagree (signed out in this browser,
  // cleared site data, a different account) every live query is denied. Detect
  // that once Auth has restored its state and send the user to sign in again
  // instead of showing a broken, half-empty app.
  useEffect(() => {
    let cancelled = false;
    const auth = clientAuth();
    auth.authStateReady().then(async () => {
      if (cancelled) return;
      if (!auth.currentUser || auth.currentUser.uid !== uid) {
        await signOutEverywhere().catch(() => {});
        router.replace("/login?reason=session");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid, router]);

  useEffect(() => {
    const ref = doc(clientDb(), `organizations/${initialOrg.id}/members/${uid}`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setMember(snap.data() as Member);
      },
      (err) => reportQueryError(`${err.code}: ${err.message}`)
    );
    return unsub;
  }, [initialOrg.id, uid]);

  return (
    <OrgContext.Provider value={{ uid, org: initialOrg, member }}>{children}</OrgContext.Provider>
  );
}
