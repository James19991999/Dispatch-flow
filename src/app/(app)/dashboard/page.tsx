"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { query, orderBy, limit } from "firebase/firestore";
import { PlusCircle, AlertTriangle, Truck, Gauge, ChevronRight, BarcodeIcon, PackageCheck, Route as RouteIcon } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useOrg } from "@/components/providers/OrgProvider";
import { vehiclesCol, deliveriesCol, auditLogCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { DeliveryFormSheet } from "@/components/deliveries/DeliveryFormSheet";
import { formatRelativeTime } from "@/lib/utils";
import { canManageFleet } from "@/lib/auth/roles";

export default function DashboardPage() {
  const { org, member } = useOrg();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: vehicles } = useLiveCollection(query(vehiclesCol(org.id)));
  const { data: deliveries, loading: deliveriesLoading } = useLiveCollection(query(deliveriesCol(org.id)));
  const { data: activity } = useLiveCollection(query(auditLogCol(org.id), orderBy("createdAt", "desc"), limit(8)));

  const stats = useMemo(() => {
    const vansActive = vehicles.filter((v) => v.status === "active").length;
    const total = deliveries.length;
    const problems = deliveries.filter((d) => d.status === "delayed" || d.status === "exception").length;
    const onTimePct = total > 0 ? Math.round(((total - problems) / total) * 1000) / 10 : 100;
    return { vansActive, totalVans: vehicles.length, onTimePct, total };
  }, [vehicles, deliveries]);

  const alerts = useMemo(
    () => deliveries.filter((d) => d.status === "delayed" || d.status === "exception").slice(0, 5),
    [deliveries]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div>
      <TopBar title={`${greeting}, ${member.name.split(" ")[0]}`} subtitle={`${org.depotName} · Shift active`} />

      <div className="space-y-6 px-4 py-5 sm:px-6">
        {canManageFleet(member.role) && (
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <PlusCircle size={18} /> Create New Dispatch
          </Button>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">On-Time Dispatch</p>
              <p className="text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">{stats.onTimePct}%</p>
              <p className="text-[11px] text-ink-muted">Target &gt;95.0% SLA</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Vans Active</p>
              <p className="text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">
                {stats.vansActive}
                <span className="text-base text-ink-muted">/{stats.totalVans}</span>
              </p>
              <p className="text-[11px] text-ink-muted">Fleet on road</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Operational SLA</p>
              <p className={`text-2xl font-extrabold tabular-nums sm:text-3xl ${stats.onTimePct >= 95 ? "text-delivered" : "text-pending"}`}>
                {stats.onTimePct >= 95 ? "Exceeding" : "Watch"}
              </p>
              <p className="text-[11px] text-ink-muted">{stats.total} dispatches</p>
            </CardBody>
          </Card>
        </div>

        {/* Action alerts */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Action Alerts</h2>
            {alerts.length > 0 && (
              <span className="rounded-full bg-critical-bg px-2 py-0.5 text-[11px] font-bold text-critical-text">
                {alerts.length} Require Touch
              </span>
            )}
          </div>
          {deliveriesLoading ? (
            <SkeletonCard />
          ) : alerts.length === 0 ? (
            <EmptyState
              icon={<PackageCheck size={22} />}
              title="No active alerts"
              description="Delays and exceptions will surface here the moment they happen."
            />
          ) : (
            <div className="space-y-2">
              {alerts.map((d) => (
                <Link key={d.id} href={`/deliveries/${d.id}`}>
                  <Card className="hover:border-brand/40 transition-colors">
                    <CardBody className="flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-critical-bg text-critical">
                        <AlertTriangle size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">
                          #{d.trackingCode} · {d.recipientName}
                        </p>
                        <p className="truncate text-xs text-ink-muted">{d.destinationAddress}</p>
                      </div>
                      <StatusPill status={d.status} />
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Live activity stream */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Live Activity Stream</h2>
            <Link href="/settings/audit-log" className="flex items-center text-xs font-semibold text-brand">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {activity.length === 0 ? (
            <EmptyState
              icon={<Gauge size={22} />}
              title="Quiet on the hub"
              description="Dispatch actions — new manifests, scans, route sends — will stream in here."
            />
          ) : (
            <Card>
              <ul className="divide-y divide-outline-variant">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-ink-muted">
                      <ActivityIcon action={a.action} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {a.actorName} · {a.detail || a.action}
                      </p>
                      <p className="text-xs text-ink-muted">{formatRelativeTime(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {!org.depotLat && (
          <div className="rounded-control border border-pending/30 bg-pending-bg px-4 py-3 text-sm text-pending-text">
            Set your depot coordinates in <Link href="/settings" className="font-bold underline">Settings</Link> to unlock Live GPS and Route Optimization maps.
          </div>
        )}
      </div>

      <DeliveryFormSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function ActivityIcon({ action }: { action: string }) {
  if (action.startsWith("delivery")) return <PackageCheck size={15} />;
  if (action.startsWith("route")) return <RouteIcon size={15} />;
  if (action.startsWith("driver") || action.startsWith("vehicle")) return <Truck size={15} />;
  return <BarcodeIcon size={15} />;
}
