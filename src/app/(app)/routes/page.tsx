"use client";

import { useState } from "react";
import Link from "next/link";
import { query, orderBy } from "firebase/firestore";
import { PlusCircle, Route as RouteIcon, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrg } from "@/components/providers/OrgProvider";
import { routesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { RouteFormSheet } from "@/components/routes/RouteFormSheet";
import { canManageFleet } from "@/lib/auth/roles";

export default function RoutesPage() {
  const { org, member } = useOrg();
  const [open, setOpen] = useState(false);
  const { data: routes, loading } = useLiveCollection(query(routesCol(org.id), orderBy("updatedAt", "desc")));

  return (
    <div>
      <TopBar title="Routes" subtitle="Smart Dispatch Engine" />
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {canManageFleet(member.role) && (
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <PlusCircle size={18} /> Build New Route
          </Button>
        )}

        {!loading && routes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon size={22} />}
            title="No routes yet"
            description="Build a route from pending deliveries and let the optimizer sequence the stops."
          />
        ) : (
          <div className="space-y-2.5">
            {routes.map((r) => (
              <Link key={r.id} href={`/routes/${r.id}`}>
                <Card className="hover:border-brand/40 transition-colors">
                  <CardBody className="flex items-center gap-3 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-transit-bg text-transit">
                      <RouteIcon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{r.name}</p>
                      <p className="text-xs text-ink-muted">
                        {r.stops.length} stops
                        {r.estMilesSaved ? ` · ${r.estMilesSaved} mi saved` : ""}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                    <ChevronRight size={16} className="text-ink-muted" />
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <RouteFormSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
