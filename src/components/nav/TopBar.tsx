"use client";

import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { query, where } from "firebase/firestore";
import { useOrg } from "@/components/providers/OrgProvider";
import { notificationsCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { Avatar } from "@/components/ui/Avatar";
import { signOutEverywhere } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { org, member, uid } = useOrg();
  const router = useRouter();
  const q = query(notificationsCol(org.id), where("read", "==", false));
  const { data: unread } = useLiveCollection(q);
  const relevant = unread.filter((n) => n.targetUid == null || n.targetUid === uid);

  async function handleSignOut() {
    await signOutEverywhere();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-outline-variant bg-surface/95 px-4 py-3.5 backdrop-blur sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-extrabold text-ink sm:text-xl">{title}</h1>
        {subtitle && <p className="truncate text-xs text-ink-muted sm:text-sm">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/notifications"
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-container"
          aria-label="Notifications"
        >
          <Bell size={19} />
          {relevant.length > 0 && (
            <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
              {relevant.length > 9 ? "9+" : relevant.length}
            </span>
          )}
        </Link>
        <Link href="/settings/profile" aria-label="Your profile">
          <Avatar name={member.name} size={38} />
        </Link>
        <button
          onClick={handleSignOut}
          className="hidden h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-container sm:flex"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
