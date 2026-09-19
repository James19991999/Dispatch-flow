"use client";

import { useState } from "react";
import { query, where } from "firebase/firestore";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useOrg } from "@/components/providers/OrgProvider";
import { deliveriesCol, driversCol, vehiclesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

export function RouteFormSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { org } = useOrg();
  const { push } = useToast();
  const router = useRouter();
  const { data: pendingDeliveries } = useLiveCollection(open ? query(deliveriesCol(org.id), where("status", "==", "pending")) : null);
  const { data: drivers } = useLiveCollection(open ? query(driversCol(org.id)) : null);
  const { data: vehicles } = useLiveCollection(open ? query(vehiclesCol(org.id)) : null);

  const [name, setName] = useState("");
  const [driverId, setDriverId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      setError("Select at least one pending delivery for this route.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const driver = drivers.find((d) => d.id === driverId);
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          driverId: driverId || null,
          vehicleId: driver?.vehicleId || null,
          deliveryIds: selected,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create route");
      push("success", `Route "${name}" created with ${selected.length} stops.`);
      onClose();
      router.push(`/routes/${body.route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Build New Route">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Route Name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Route Alpha-04" />
        </div>
        <div>
          <Label>Assign Driver (optional)</Label>
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Unassigned</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.vehicleId ? `· ${vehicles.find((v) => v.id === d.vehicleId)?.label ?? ""}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Pending Deliveries ({selected.length} selected)</Label>
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-control border border-outline-variant p-2">
            {pendingDeliveries.length === 0 && <p className="p-2 text-sm text-ink-muted">No pending deliveries to route.</p>}
            {pendingDeliveries.map((d) => (
              <label key={d.id} className="flex items-center gap-2.5 rounded-control p-2 hover:bg-surface-container">
                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} className="h-4 w-4 accent-brand" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{d.destinationAddress}</p>
                  <p className="truncate text-xs text-ink-muted">{d.recipientName} · #{d.trackingCode}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" loading={loading} className="w-full">
          Build Route
        </Button>
      </form>
    </Sheet>
  );
}
