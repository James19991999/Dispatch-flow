"use client";

import { useState } from "react";
import { query } from "firebase/firestore";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useOrg } from "@/components/providers/OrgProvider";
import { driversCol, vehiclesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";

export function DeliveryFormSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { org } = useOrg();
  const { push } = useToast();
  const { data: drivers } = useLiveCollection(open ? query(driversCol(org.id)) : null);
  const { data: vehicles } = useLiveCollection(open ? query(vehiclesCol(org.id)) : null);

  const [recipientName, setRecipientName] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [priority, setPriority] = useState("standard");
  const [parcelCount, setParcelCount] = useState(1);
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setRecipientName("");
    setDestinationAddress("");
    setPriority("standard");
    setParcelCount(1);
    setDriverId("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const driver = drivers.find((d) => d.id === driverId);
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          destinationAddress,
          priority,
          parcelCount,
          driverId: driverId || null,
          vehicleId: driver?.vehicleId || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create dispatch");
      push("success", `Dispatch manifest ${body.delivery.trackingCode} created.`);
      reset();
      onClose();
      onCreated?.(body.delivery.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Create New Dispatch">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Recipient</Label>
          <Input required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name" />
        </div>
        <div>
          <Label>Destination Address</Label>
          <Input required value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} placeholder="742 Evergreen Terrace" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="standard">Standard</option>
              <option value="priority">Priority</option>
              <option value="cold_chain">Cold Chain</option>
              <option value="medical">Medical</option>
            </Select>
          </div>
          <div>
            <Label>Parcels</Label>
            <Input
              type="number"
              min={1}
              max={999}
              value={parcelCount}
              onChange={(e) => setParcelCount(Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <Label>Assign Driver (optional)</Label>
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Unassigned — staged</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.vehicleId ? `· ${vehicles.find((v) => v.id === d.vehicleId)?.label ?? ""}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" loading={loading} className="w-full">
          Create Dispatch
        </Button>
      </form>
    </Sheet>
  );
}
