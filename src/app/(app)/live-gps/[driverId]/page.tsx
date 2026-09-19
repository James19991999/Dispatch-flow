"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, query, where } from "firebase/firestore";
import { ArrowLeft, Phone, MessageSquare, Share2, Navigation, Star } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrg } from "@/components/providers/OrgProvider";
import { clientDb } from "@/lib/firebase/client";
import { deliveriesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { FleetMapClient } from "@/components/live-gps/FleetMapClient";
import { haversineKm } from "@/lib/geo";
import { useToast } from "@/components/ui/Toast";
import type { Driver } from "@/types/models";

export default function DriverGpsDetailPage() {
  const { driverId } = useParams<{ driverId: string }>();
  const { org } = useOrg();
  const { push } = useToast();
  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const { data: deliveries } = useLiveCollection(query(deliveriesCol(org.id), where("driverId", "==", driverId)));

  useEffect(() => {
    const ref = doc(clientDb(), `organizations/${org.id}/drivers/${driverId}`);
    return onSnapshot(ref, (snap) => setDriver(snap.exists() ? (snap.data() as Driver) : null));
  }, [org.id, driverId]);

  if (driver === undefined) return null;
  if (driver === null) {
    return (
      <div>
        <TopBar title="Driver not found" />
        <div className="p-6">
          <Link href="/live-gps" className="text-sm font-semibold text-brand">
            <ArrowLeft className="mr-1 inline" size={14} /> Back to Live GPS
          </Link>
        </div>
      </div>
    );
  }

  const activeDelivery = deliveries.find((d) => d.status === "in_transit") ?? deliveries[0];
  const pos = driver.lastKnownPosition;
  const distanceKm =
    pos && activeDelivery?.lat && activeDelivery?.lng
      ? haversineKm(pos, { lat: activeDelivery.lat, lng: activeDelivery.lng })
      : null;

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: `${driver!.name} — live location`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      push("success", "Tracking link copied to clipboard.");
    }
  }

  return (
    <div>
      <TopBar title={driver.name} subtitle={activeDelivery ? `Stop · ${activeDelivery.destinationAddress}` : "No active stop"} />
      <div className="space-y-4 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/live-gps" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Live GPS
        </Link>

        {org.depotLat != null && org.depotLng != null && pos ? (
          <FleetMapClient
            depot={{ lat: org.depotLat, lng: org.depotLng }}
            drivers={[driver]}
            deliveries={activeDelivery ? [activeDelivery] : []}
            selectedDriverId={driver.id}
            height={300}
          />
        ) : (
          <EmptyState icon={<Navigation size={22} />} title="No live position yet" description="This driver hasn't reported a GPS position." />
        )}

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={driver.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{driver.name}</p>
                <span className="flex items-center gap-1 text-xs text-ink-muted">
                  <Star size={12} className="fill-pending text-pending" /> {driver.rating} · {driver.phone}
                </span>
              </div>
              <StatusPill status={driver.status} />
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-outline-variant pt-3 text-center">
              <div>
                <p className="text-lg font-extrabold tabular-nums text-ink">{Math.round(pos?.speedKph ?? 0)}</p>
                <p className="text-[10px] font-bold uppercase text-ink-muted">mph/kph</p>
              </div>
              <div>
                <p className="text-lg font-extrabold tabular-nums text-ink">{distanceKm ? distanceKm.toFixed(1) : "—"}</p>
                <p className="text-[10px] font-bold uppercase text-ink-muted">km remaining</p>
              </div>
              <div>
                <p className="text-lg font-extrabold tabular-nums text-ink">{driver.lastPingAt ? "Live" : "—"}</p>
                <p className="text-[10px] font-bold uppercase text-ink-muted">signal</p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-outline-variant pt-3">
              <a href={`tel:${driver.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-outline-variant py-2.5 text-xs font-bold text-ink hover:bg-surface-container">
                <Phone size={14} /> Call
              </a>
              <a href={`sms:${driver.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-outline-variant py-2.5 text-xs font-bold text-ink hover:bg-surface-container">
                <MessageSquare size={14} /> Message
              </a>
              <button onClick={share} className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-outline-variant py-2.5 text-xs font-bold text-ink hover:bg-surface-container">
                <Share2 size={14} /> Share
              </button>
            </div>
          </CardBody>
        </Card>

        {activeDelivery && (
          <Card>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-ink-muted">Current Stop</p>
                <p className="text-sm font-bold text-ink">#{activeDelivery.trackingCode} · {activeDelivery.recipientName}</p>
              </div>
              <Link href={`/deliveries/${activeDelivery.id}`} className="text-xs font-bold text-brand">
                View
              </Link>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
