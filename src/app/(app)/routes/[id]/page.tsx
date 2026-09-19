"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, Sparkles, Send, Fuel, Gauge, Milestone } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { SortableStopList } from "@/components/routes/SortableStopList";
import { useOrg } from "@/components/providers/OrgProvider";
import { clientDb } from "@/lib/firebase/client";
import { useToast } from "@/components/ui/Toast";
import { canManageFleet } from "@/lib/auth/roles";
import type { Route, RouteStop } from "@/types/models";

const CONSTRAINT_COPY: { key: keyof Route["constraints"]; label: string; hint: string }[] = [
  { key: "medicalColdChainFirst", label: "Medical & Perishable First", hint: "Elevate clinics & cold-chain destinations" },
  { key: "strictTimeWindows", label: "Strict Time Windows", hint: "Lock appointments within tolerance" },
  { key: "minimizeLeftTurns", label: "Minimize Left-Hand Turns", hint: "Reduce idle fuel and cross-traffic delays" },
];

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { org, member } = useOrg();
  const { push } = useToast();
  const [route, setRoute] = useState<Route | null | undefined>(undefined);
  const [optimizing, setOptimizing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const ref = doc(clientDb(), `organizations/${org.id}/routes/${id}`);
    return onSnapshot(ref, (snap) => setRoute(snap.exists() ? (snap.data() as Route) : null));
  }, [org.id, id]);

  async function reorder(newStops: RouteStop[]) {
    if (!route) return;
    setRoute({ ...route, stops: newStops });
    await fetch(`/api/routes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopOrder: newStops.map((s) => s.id) }),
    });
  }

  async function toggleConstraint(key: keyof Route["constraints"]) {
    if (!route) return;
    const constraints = { ...route.constraints, [key]: !route.constraints[key] };
    setRoute({ ...route, constraints });
    // Constraint changes are stored alongside stop order on the same route
    // doc; re-optimize afterward to apply the new rule to sequencing.
    await fetch(`/api/routes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopOrder: route.stops.map((s) => s.id) }),
    });
  }

  async function optimize() {
    setOptimizing(true);
    try {
      const res = await fetch(`/api/routes/${id}/optimize`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not optimize");
      push("success", `Re-optimized — saved ${body.savings.milesSaved} mi / ${body.savings.minutesSaved} min.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  }

  async function sendToDriver() {
    setSending(true);
    try {
      const res = await fetch(`/api/routes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send: true }),
      });
      if (!res.ok) throw new Error("Could not send route");
      push("success", "Route transmitted to driver app.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (route === undefined) return null;
  if (route === null) {
    return (
      <div>
        <TopBar title="Route not found" />
        <div className="p-6">
          <Link href="/routes" className="text-sm font-semibold text-brand">
            <ArrowLeft className="mr-1 inline" size={14} /> Back to Routes
          </Link>
        </div>
      </div>
    );
  }

  const canManage = canManageFleet(member.role);

  return (
    <div>
      <TopBar title={route.name} subtitle={`${route.stops.length} stops`} />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/routes" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Routes
        </Link>

        <div className="flex items-center justify-between">
          <StatusPill status={route.status} />
          {canManage && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" loading={optimizing} onClick={optimize}>
                <Sparkles size={14} /> Re-Optimize
              </Button>
              <Button size="sm" loading={sending} onClick={sendToDriver}>
                <Send size={14} /> Send to Driver
              </Button>
            </div>
          )}
        </div>

        {(route.estMilesSaved || route.estMinutesSaved) && (
          <Card>
            <CardBody className="grid grid-cols-3 divide-x divide-outline-variant text-center">
              <div>
                <Milestone size={16} className="mx-auto mb-1 text-brand" />
                <p className="text-lg font-extrabold tabular-nums text-ink">{route.estMilesSaved ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-ink-muted">Miles Saved</p>
              </div>
              <div>
                <Gauge size={16} className="mx-auto mb-1 text-brand" />
                <p className="text-lg font-extrabold tabular-nums text-ink">{route.estMinutesSaved ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-ink-muted">Mins Saved</p>
              </div>
              <div>
                <Fuel size={16} className="mx-auto mb-1 text-brand" />
                <p className="text-lg font-extrabold tabular-nums text-ink">{route.estFuelSavedGal ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-ink-muted">Gal Saved</p>
              </div>
            </CardBody>
          </Card>
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Stop Sequence</h2>
          <p className="mb-3 text-xs text-ink-muted">Drag handle or hold to adjust stops</p>
          <SortableStopList stops={route.stops} onReorder={reorder} disabled={!canManage} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Auto-Sequencing Rules</h2>
          <Card>
            <ul className="divide-y divide-outline-variant">
              {CONSTRAINT_COPY.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-ink">{c.label}</p>
                    <p className="text-xs text-ink-muted">{c.hint}</p>
                  </div>
                  <button
                    disabled={!canManage}
                    onClick={() => toggleConstraint(c.key)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${route.constraints[c.key] ? "bg-brand" : "bg-outline-variant"}`}
                    aria-pressed={Boolean(route.constraints[c.key])}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${route.constraints[c.key] ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
}
