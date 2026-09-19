"use client";

import { useState } from "react";
import Link from "next/link";
import { query } from "firebase/firestore";
import { ArrowLeft, PlusCircle, Car, Trash2, Battery } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrg } from "@/components/providers/OrgProvider";
import { vehiclesCol, driversCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";
import { canManageFleet, canManageTeam } from "@/lib/auth/roles";

export default function VehiclesPage() {
  const { org, member } = useOrg();
  const { push } = useToast();
  const canManage = canManageFleet(member.role);
  const canDelete = canManageTeam(member.role);
  const { data: vehicles, loading } = useLiveCollection(query(vehiclesCol(org.id)));
  const { data: drivers } = useLiveCollection(query(driversCol(org.id)));

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("van");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, plate, type }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not add vehicle");
      push("success", `${label} added to the fleet.`);
      setLabel("");
      setPlate("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function removeVehicle(id: string) {
    if (!confirm("Remove this vehicle?")) return;
    const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    if (res.ok) push("success", "Vehicle removed.");
    else push("error", "Could not remove vehicle.");
  }

  return (
    <div>
      <TopBar title="Vehicles" subtitle={`${vehicles.length} in fleet`} />
      <div className="space-y-4 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Settings
        </Link>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <PlusCircle size={16} /> Add Vehicle
          </Button>
        )}

        {!loading && vehicles.length === 0 ? (
          <EmptyState icon={<Car size={22} />} title="No vehicles yet" description="Add a van, truck, motorbike or EV to start assigning routes." />
        ) : (
          <div className="space-y-2.5">
            {vehicles.map((v) => (
              <Card key={v.id}>
                <CardBody className="flex items-center gap-3 py-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-ink-muted">
                    <Car size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{v.label} · {v.plate}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {drivers.find((d) => d.id === v.assignedDriverId)?.name ?? "Unassigned"} · {v.type}
                    </p>
                  </div>
                  {v.fuelOrChargePct != null && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-ink-muted">
                      <Battery size={13} /> {v.fuelOrChargePct}%
                    </span>
                  )}
                  <StatusPill status={v.status} />
                  {canDelete && (
                    <button onClick={() => removeVehicle(v.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-critical hover:bg-critical-bg" aria-label="Remove vehicle">
                      <Trash2 size={15} />
                    </button>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add Vehicle">
        <form onSubmit={addVehicle} className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Van-05" />
          </div>
          <div>
            <Label>License Plate</Label>
            <Input required value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="KDA 214B" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
              <option value="motorbike">Motorbike</option>
              <option value="ev">EV</option>
            </Select>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" loading={saving} className="w-full">
            Add Vehicle
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
