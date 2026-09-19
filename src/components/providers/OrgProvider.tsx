"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
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

  useEffect(() => {
    const ref = doc(clientDb(), `organizations/${initialOrg.id}/members/${uid}`);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setMember(snap.data() as Member);
    });
    return unsub;
  }, [initialOrg.id, uid]);

  return (
    <OrgContext.Provider value={{ uid, org: initialOrg, member }}>{children}</OrgContext.Provider>
  );
}
