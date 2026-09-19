"use client";

import Link from "next/link";
import { query } from "firebase/firestore";
import { MapPinned, ChevronRight, Star } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { useOrg } from "@/components/providers/OrgProvider";
import { driversCol, deliveriesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { FleetMapClient } from "@/components/live-gps/FleetMapClient";

export default function LiveGpsPage() {
  const { org } = useOrg();
  const { data: drivers } = useLiveCollection(query(driversCol(org.id)));
  const { data: deliveries } = useLiveCollection(query(deliveriesCol(org.id)));
  const onRoad = drivers.filter((d) => d.status === "on_road");

  return (
    <div>
      <TopBar title="Live GPS" subtitle={`${onRoad.length} vehicle${onRoad.length === 1 ? "" : "s"} on road`} />
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {org.depotLat != null && org.depotLng != null ? (
          <FleetMapClient
            depot={{ lat: org.depotLat, lng: org.depotLng }}
            drivers={drivers}
            deliveries={deliveries}
          />
        ) : (
          <EmptyState
            icon={<MapPinned size={22} />}
            title="Map not configured yet"
            description="Set your depot coordinates in Settings to enable live fleet tracking."
          />
        )}

        <div className="space-y-2.5">
          {onRoad.length === 0 ? (
            <EmptyState
              icon={<MapPinned size={22} />}
              title="No vehicles on road"
              description="Drivers marked on-road with an active dispatch will appear here in real time."
            />
          ) : (
            onRoad.map((d) => {
              const activeDelivery = deliveries.find((del) => del.driverId === d.id && del.status === "in_transit");
              return (
                <Link key={d.id} href={`/live-gps/${d.id}`}>
                  <Card className="hover:border-brand/40 transition-colors">
                    <CardBody className="flex items-center gap-3 py-3.5">
                      <Avatar name={d.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {activeDelivery ? `→ ${activeDelivery.destinationAddress}` : "Awaiting next stop"}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-ink-muted">
                        <Star size={12} className="fill-pending text-pending" /> {d.rating}
                      </span>
                      <StatusPill status={d.status} />
                      <ChevronRight size={16} className="text-ink-muted" />
                    </CardBody>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
