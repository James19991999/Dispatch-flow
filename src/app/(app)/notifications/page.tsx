"use client";

import { useState } from "react";
import Link from "next/link";
import { query, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrg } from "@/components/providers/OrgProvider";
import { notificationsCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { clientDb } from "@/lib/firebase/client";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime, cx } from "@/lib/utils";

export default function NotificationsPage() {
  const { org, uid } = useOrg();
  const { push } = useToast();
  const [markingAll, setMarkingAll] = useState(false);
  const { data: all, loading } = useLiveCollection(query(notificationsCol(org.id), orderBy("createdAt", "desc"), limit(100)));
  const relevant = all.filter((n) => n.targetUid == null || n.targetUid === uid);
  const unreadCount = relevant.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await updateDoc(doc(clientDb(), `organizations/${org.id}/notifications/${id}`), { read: true });
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      push("success", "All caught up.");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div>
      <TopBar title="Notifications" subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} />
      <div className="space-y-4 px-4 py-5 sm:px-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
            <ArrowLeft size={14} /> Back
          </Link>
          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead} loading={markingAll}>
              <CheckCheck size={14} /> Mark all read
            </Button>
          )}
        </div>

        {!loading && relevant.length === 0 ? (
          <EmptyState icon={<Bell size={22} />} title="No notifications yet" description="Delays, SLA breaches, new reviews and route changes will show up here." />
        ) : (
          <Card>
            <ul className="divide-y divide-outline-variant">
              {relevant.map((n) => {
                const content = (
                  <div className={cx("flex items-start gap-3 px-4 py-3.5", !n.read && "bg-brand-light/20")}>
                    <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{n.title}</p>
                      <p className="text-xs text-ink-muted">{n.body}</p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} onClick={() => !n.read && markRead(n.id)}>
                    {n.link ? (
                      <Link href={n.link} className="block hover:bg-surface-container">
                        {content}
                      </Link>
                    ) : (
                      <div className="cursor-pointer hover:bg-surface-container">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
