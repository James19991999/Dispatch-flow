"use client";

import Link from "next/link";
import { query, orderBy, limit } from "firebase/firestore";
import { ArrowLeft, ScrollText } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrg } from "@/components/providers/OrgProvider";
import { auditLogCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { formatRelativeTime } from "@/lib/utils";

export default function AuditLogPage() {
  const { org } = useOrg();
  const { data: entries, loading } = useLiveCollection(query(auditLogCol(org.id), orderBy("createdAt", "desc"), limit(200)));

  return (
    <div>
      <TopBar title="Audit Log" subtitle="Who changed what, when" />
      <div className="space-y-4 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Settings
        </Link>

        {!loading && entries.length === 0 ? (
          <EmptyState icon={<ScrollText size={22} />} title="No activity recorded yet" description="Every dispatch, route, and settings change will be logged here." />
        ) : (
          <Card>
            <ul className="divide-y divide-outline-variant">
              {entries.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-ink">
                    {e.actorName} <span className="font-normal text-ink-muted">· {e.action}</span>
                  </p>
                  {e.detail && <p className="text-xs text-ink-muted">{e.detail}</p>}
                  <p className="mt-0.5 text-[11px] text-ink-muted">{formatRelativeTime(e.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
