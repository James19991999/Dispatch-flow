"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, query } from "firebase/firestore";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { useOrg } from "@/components/providers/OrgProvider";
import { clientDb } from "@/lib/firebase/client";
import { vehiclesCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";
import { canManageFleet, canManageTeam } from "@/lib/auth/roles";
import type { Driver } from "@/types/models";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { org, member } = useOrg();
  const { push } = useToast();
  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const { data: vehicles } = useLiveCollection(query(vehiclesCol(org.id)));
  const [form, setForm] = useState({ name: "", phone: "", status: "available", vehicleId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(clientDb(), `organizations/${org.id}/drivers/${id}`);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Driver;
        setDriver(d);
        setForm({ name: d.name, phone: d.phone, status: d.status, vehicleId: d.vehicleId ?? "" });
      } else {
        setDriver(null);
      }
    });
  }, [org.id, id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vehicleId: form.vehicleId || null }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Could not save");
      }
      push("success", "Driver updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Remove this driver from the roster?")) return;
    const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
    if (res.ok) {
      push("success", "Driver removed.");
      history.back();
    } else {
      push("error", "Could not remove driver.");
    }
  }

  if (driver === undefined) return null;
  if (driver === null) {
    return (
      <div>
        <TopBar title="Driver not found" />
        <div className="p-6">
          <Link href="/settings/drivers" className="text-sm font-semibold text-brand">
            <ArrowLeft className="mr-1 inline" size={14} /> Back to Drivers
          </Link>
        </div>
      </div>
    );
  }

  const canManage = canManageFleet(member.role);
  const canDelete = canManageTeam(member.role);

  return (
    <div>
      <TopBar title={driver.name} subtitle="Driver profile" />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/settings/drivers" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Drivers
        </Link>

        <div className="flex items-center gap-3">
          <Avatar name={driver.name} size={52} />
          <div>
            <p className="text-lg font-bold text-ink">{driver.name}</p>
            <p className="text-sm text-ink-muted">{driver.rating}★ rating</p>
          </div>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input disabled={!canManage} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input disabled={!canManage} required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select disabled={!canManage} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="available">Available</option>
                  <option value="on_road">On Road</option>
                  <option value="off_duty">Off Duty</option>
                </Select>
              </div>
              <div>
                <Label>Vehicle</Label>
                <Select disabled={!canManage} value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.label} · {v.plate}</option>
                  ))}
                </Select>
              </div>
              <FieldError>{error}</FieldError>
              {canManage && (
                <div className="flex gap-2">
                  <Button type="submit" loading={saving}>
                    <Save size={14} /> Save
                  </Button>
                  {canDelete && (
                    <Button type="button" variant="danger" onClick={remove}>
                      <Trash2 size={14} /> Remove
                    </Button>
                  )}
                </div>
              )}
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
