"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { query, orderBy } from "firebase/firestore";
import { PlusCircle, Package, Thermometer, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useOrg } from "@/components/providers/OrgProvider";
import { deliveriesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { DeliveryFormSheet } from "@/components/deliveries/DeliveryFormSheet";
import { cx } from "@/lib/utils";
import { canManageFleet } from "@/lib/auth/roles";
import type { DeliveryStatus } from "@/types/models";

const FILTERS: { key: "all" | DeliveryStatus | "exceptions"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_transit", label: "In Transit" },
  { key: "pending", label: "Pending" },
  { key: "exceptions", label: "Exceptions" },
];

export default function DeliveriesPage() {
  const { org, member } = useOrg();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: deliveries, loading } = useLiveCollection(query(deliveriesCol(org.id), orderBy("createdAt", "desc")));

  const onTimeToday = useMemo(() => {
    const today = deliveries.filter((d) => new Date(d.createdAt).toDateString() === new Date().toDateString());
    if (today.length === 0) return 100;
    const problems = today.filter((d) => d.status === "delayed" || d.status === "exception").length;
    return Math.round(((today.length - problems) / today.length) * 1000) / 10;
  }, [deliveries]);

  const filtered = useMemo(() => {
    if (filter === "all") return deliveries;
    if (filter === "exceptions") return deliveries.filter((d) => d.status === "exception" || d.status === "delayed");
    return deliveries.filter((d) => d.status === filter);
  }, [deliveries, filter]);

  return (
    <div>
      <TopBar title="Deliveries" subtitle={`${onTimeToday}% on-time today`} />
      <div className="space-y-4 px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cx(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                  filter === f.key ? "bg-brand text-white" : "bg-surface-container text-ink-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {canManageFleet(member.role) && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
              <PlusCircle size={16} />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package size={22} />}
            title="No deliveries here yet"
            description="Create a dispatch to start tracking parcels through their journey."
            action={
              canManageFleet(member.role) && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Create Dispatch
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((d) => (
              <Link key={d.id} href={`/deliveries/${d.id}`}>
                <Card className="hover:border-brand/40 transition-colors">
                  <CardBody className="space-y-2.5 py-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold tracking-wider text-ink-muted">#{d.trackingCode}</span>
                      <StatusPill status={d.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{d.destinationAddress}</p>
                        <p className="truncate text-xs text-ink-muted">{d.recipientName}</p>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-ink-muted" />
                    </div>
                    <div className="flex items-center gap-3 border-t border-outline-variant pt-2.5 text-xs text-ink-muted">
                      <span>{d.parcelCount} parcel{d.parcelCount > 1 ? "s" : ""}</span>
                      {d.eta && <span>ETA {new Date(d.eta).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>}
                      {d.coldChainTempC != null && (
                        <span className="flex items-center gap-1">
                          <Thermometer size={12} /> {d.coldChainTempC}°C
                        </span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <DeliveryFormSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
