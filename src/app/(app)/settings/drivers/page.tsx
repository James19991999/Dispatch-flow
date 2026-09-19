"use client";

import { useState } from "react";
import Link from "next/link";
import { query } from "firebase/firestore";
import { ArrowLeft, PlusCircle, Star, ChevronRight, Truck } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useOrg } from "@/components/providers/OrgProvider";
import { driversCol, vehiclesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";
import { canManageFleet } from "@/lib/auth/roles";

export default function DriversPage() {
  const { org, member } = useOrg();
  const { push } = useToast();
  const canManage = canManageFleet(member.role);
  const { data: drivers, loading } = useLiveCollection(query(driversCol(org.id)));
  const { data: vehicles } = useLiveCollection(query(vehiclesCol(org.id)));

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, vehicleId: vehicleId || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not add driver");
      push("success", `${name} added to the roster.`);
      setName("");
      setPhone("");
      setVehicleId("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <TopBar title="Drivers" subtitle={`${drivers.length} on roster`} />
      <div className="space-y-4 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Settings
        </Link>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <PlusCircle size={16} /> Add Driver
          </Button>
        )}

        {!loading && drivers.length === 0 ? (
          <EmptyState icon={<Truck size={22} />} title="No drivers yet" description="Add your first driver to start assigning deliveries." />
        ) : (
          <div className="space-y-2.5">
            {drivers.map((d) => (
              <Link key={d.id} href={`/settings/drivers/${d.id}`}>
                <Card className="hover:border-brand/40 transition-colors">
                  <CardBody className="flex items-center gap-3 py-3.5">
                    <Avatar name={d.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{d.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {vehicles.find((v) => v.id === d.vehicleId)?.label ?? "No vehicle"} · {d.phone}
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
            ))}
          </div>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add Driver">
        <form onSubmit={addDriver} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sara Kimani" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
          </div>
          <div>
            <Label>Assign Vehicle (optional)</Label>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">None yet</option>
              {vehicles.filter((v) => !v.assignedDriverId).map((v) => (
                <option key={v.id} value={v.id}>{v.label} · {v.plate}</option>
              ))}
            </Select>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" loading={saving} className="w-full">
            Add Driver
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
