"use client";

import { useMemo, useState } from "react";
import { query } from "firebase/firestore";
import { Download, Trophy, ShieldCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useOrg } from "@/components/providers/OrgProvider";
import { deliveriesCol, driversCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";
import { canManageFleet } from "@/lib/auth/roles";

const STATUS_COLORS: Record<string, string> = {
  delivered: "#10b981",
  in_transit: "#3b82f6",
  pending: "#f59e0b",
  delayed: "#f97316",
  exception: "#ef4444",
};

export default function ReportsPage() {
  const { org, member } = useOrg();
  const { push } = useToast();
  const [exporting, setExporting] = useState(false);
  const { data: deliveries } = useLiveCollection(query(deliveriesCol(org.id)));
  const { data: drivers } = useLiveCollection(query(driversCol(org.id)));

  const stats = useMemo(() => {
    const total = deliveries.length;
    const delivered = deliveries.filter((d) => d.status === "delivered").length;
    const problems = deliveries.filter((d) => d.status === "delayed" || d.status === "exception").length;
    const onTimePct = total > 0 ? Math.round(((total - problems) / total) * 1000) / 10 : 100;
    const totalParcels = deliveries.reduce((s, d) => s + d.parcelCount, 0);
    return { total, delivered, onTimePct, totalParcels };
  }, [deliveries]);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    deliveries.forEach((d) => {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ name: status.replace("_", " "), status, value }));
  }, [deliveries]);

  const leaderboard = useMemo(() => {
    return [...drivers]
      .map((d) => {
        const own = deliveries.filter((del) => del.driverId === d.id);
        const delivered = own.filter((del) => del.status === "delivered").length;
        return { ...d, delivered, total: own.length };
      })
      .sort((a, b) => b.rating - a.rating || b.delivered - a.delivered)
      .slice(0, 5);
  }, [drivers, deliveries]);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch("/api/reports/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dispatchflow-export-${org.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      push("success", "Report exported successfully");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <TopBar title="Performance Reports" subtitle="Fleet Intelligence" />
      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardBody className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-ink-muted">On-Time Rate</p>
              <p className="text-xl font-extrabold tabular-nums text-ink">{stats.onTimePct}%</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-ink-muted">Total Dispatches</p>
              <p className="text-xl font-extrabold tabular-nums text-ink">{stats.total}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-ink-muted">Delivered</p>
              <p className="text-xl font-extrabold tabular-nums text-ink">{stats.delivered}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-ink-muted">Parcels</p>
              <p className="text-xl font-extrabold tabular-nums text-ink">{stats.totalParcels}</p>
            </CardBody>
          </Card>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Consignment Distribution</h2>
          <Card>
            <CardBody>
              {deliveries.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">No dispatches yet to chart.</p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div style={{ width: 180, height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                          {distribution.map((d) => (
                            <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-1.5">
                    {distribution.map((d) => (
                      <li key={d.status} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d.status] ?? "#94a3b8" }} />
                        <span className="font-medium text-ink capitalize">{d.name}</span>
                        <span className="text-ink-muted">({d.value})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <Trophy size={15} className="text-pending" /> Driver Leaderboard
          </h2>
          <Card>
            <ul className="divide-y divide-outline-variant">
              {leaderboard.length === 0 && <li className="p-4 text-sm text-ink-muted">No drivers yet.</li>}
              {leaderboard.map((d, i) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-4 text-sm font-extrabold text-ink-muted">{i + 1}</span>
                  <Avatar name={d.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                    <p className="text-xs text-ink-muted">{d.delivered}/{d.total} delivered</p>
                  </div>
                  <span className="text-sm font-extrabold tabular-nums text-ink">{d.rating.toFixed(1)}★</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {canManageFleet(member.role) && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-ink">Export Performance Audit</h2>
            <Card>
              <CardBody className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <ShieldCheck size={13} /> Every export is SHA-256 hashed and recorded to the audit log for accounting reconciliation.
                </p>
                <Button onClick={exportCsv} loading={exporting} className="w-full sm:w-auto">
                  <Download size={16} /> Download CSV Audit
                </Button>
              </CardBody>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
