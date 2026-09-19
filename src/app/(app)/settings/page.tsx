"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Truck, Car, ScrollText, Building2, MapPin, Sparkles, HelpCircle, Sun, Moon, Monitor, CreditCard } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { useOrg } from "@/components/providers/OrgProvider";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/components/providers/ThemeProvider";
import { canManageTeam } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cx } from "@/lib/utils";

const TIMEZONES = ["Africa/Nairobi", "Africa/Lagos", "Africa/Johannesburg", "Africa/Cairo", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai"];

export default function SettingsPage() {
  const { org, member } = useOrg();
  const { push } = useToast();
  const { theme, setTheme } = useTheme();
  const canAdmin = canManageTeam(member.role);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: org.name,
    depotName: org.depotName,
    depotAddress: org.depotAddress,
    depotLat: org.depotLat?.toString() ?? "",
    depotLng: org.depotLng?.toString() ?? "",
    timezone: org.timezone,
    units: org.units,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          depotName: form.depotName,
          depotAddress: form.depotAddress,
          depotLat: form.depotLat ? Number(form.depotLat) : null,
          depotLng: form.depotLng ? Number(form.depotLng) : null,
          timezone: form.timezone,
          units: form.units,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Could not save");
      }
      push("success", "Organization settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not seed demo data");
      push("success", "Demo fleet data added — explore the dashboard!");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <TopBar title="Settings" subtitle={org.name} />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-2xl">
        {canAdmin && !org.seeded && (
          <Card className="border-brand/30 bg-brand-light/30">
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">Explore with demo data</p>
                <p className="text-xs text-ink-muted">Seed sample drivers, vehicles &amp; deliveries — one-time only.</p>
              </div>
              <Button size="sm" onClick={seed} loading={seeding}>
                <Sparkles size={14} /> Seed
              </Button>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <SettingsLink href="/settings/team" icon={Users} label="Team" />
          <SettingsLink href="/settings/drivers" icon={Truck} label="Drivers" />
          <SettingsLink href="/settings/vehicles" icon={Car} label="Vehicles" />
          {canAdmin && <SettingsLink href="/settings/audit-log" icon={ScrollText} label="Audit Log" />}
          <SettingsLink href="/settings/billing" icon={CreditCard} label="Billing" />
          <SettingsLink href="/help" icon={HelpCircle} label="Help" />
        </div>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <Building2 size={15} /> Organization
          </h2>
          <Card>
            <CardBody>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <Label>Organization Name</Label>
                  <Input disabled={!canAdmin} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Depot / Hub Name</Label>
                  <Input disabled={!canAdmin} required value={form.depotName} onChange={(e) => setForm((f) => ({ ...f, depotName: e.target.value }))} />
                </div>
                <div>
                  <Label>Depot Address</Label>
                  <Input disabled={!canAdmin} required value={form.depotAddress} onChange={(e) => setForm((f) => ({ ...f, depotAddress: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1"><MapPin size={11} /> Depot Latitude</Label>
                    <Input disabled={!canAdmin} type="number" step="any" value={form.depotLat} onChange={(e) => setForm((f) => ({ ...f, depotLat: e.target.value }))} placeholder="-1.2921" />
                  </div>
                  <div>
                    <Label>Depot Longitude</Label>
                    <Input disabled={!canAdmin} type="number" step="any" value={form.depotLng} onChange={(e) => setForm((f) => ({ ...f, depotLng: e.target.value }))} placeholder="36.8219" />
                  </div>
                </div>
                <p className="text-xs text-ink-muted -mt-2">
                  Powers Live GPS &amp; Route Optimization maps. No geocoding provider is wired in — enter coordinates manually (e.g. from Google Maps &quot;copy coordinates&quot;).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Timezone</Label>
                    <Select disabled={!canAdmin} value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Distance Units</Label>
                    <Select disabled={!canAdmin} value={form.units} onChange={(e) => setForm((f) => ({ ...f, units: e.target.value as "mi" | "km" }))}>
                      <option value="mi">Miles</option>
                      <option value="km">Kilometers</option>
                    </Select>
                  </div>
                </div>
                <FieldError>{error}</FieldError>
                {canAdmin && (
                  <Button type="submit" loading={saving}>
                    Save Changes
                  </Button>
                )}
              </form>
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Appearance</h2>
          <Card>
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">Theme</p>
                <p className="text-xs text-ink-muted">Applies instantly, saved on this device.</p>
              </div>
              <div className="flex rounded-control border border-outline-variant p-0.5">
                {(
                  [
                    { key: "light", icon: Sun, label: "Light" },
                    { key: "dark", icon: Moon, label: "Dark" },
                    { key: "system", icon: Monitor, label: "System" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTheme(opt.key)}
                    aria-pressed={theme === opt.key}
                    aria-label={opt.label}
                    title={opt.label}
                    className={cx(
                      "flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors",
                      theme === opt.key ? "bg-brand text-white" : "text-ink-muted hover:bg-surface-container"
                    )}
                  >
                    <opt.icon size={15} />
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Plan</h2>
          <Card>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold capitalize text-ink">{org.planTier}</p>
                <p className="text-xs text-ink-muted">Card or M-Pesa via IntaSend.</p>
              </div>
              <Link href="/settings/billing" className="text-xs font-bold text-brand">
                Manage plan
              </Link>
            </CardBody>
          </Card>
        </section>

        <p className="text-center text-xs text-ink-muted">
          Signed in as {member.name} · {ROLE_LABELS[member.role]}
        </p>
      </div>
    </div>
  );
}

function SettingsLink({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-brand/40 transition-colors">
        <CardBody className="flex flex-col items-center gap-1.5 py-4 text-center">
          <Icon size={20} className="text-brand" />
          <span className="text-xs font-bold text-ink">{label}</span>
        </CardBody>
      </Card>
    </Link>
  );
}
