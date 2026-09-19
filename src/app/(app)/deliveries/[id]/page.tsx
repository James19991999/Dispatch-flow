"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, MapPin, Package, Thermometer, CheckCircle2, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Sheet } from "@/components/ui/Sheet";
import { Input, Label } from "@/components/ui/Field";
import { SignaturePad } from "@/components/deliveries/SignaturePad";
import { useOrg } from "@/components/providers/OrgProvider";
import { clientDb } from "@/lib/firebase/client";
import { useToast } from "@/components/ui/Toast";
import { formatTime, cx } from "@/lib/utils";
import { canManageFleet } from "@/lib/auth/roles";
import type { Delivery, DeliveryStatus } from "@/types/models";
import Link from "next/link";

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { org, member } = useOrg();
  const { push } = useToast();
  const [delivery, setDelivery] = useState<Delivery | null | undefined>(undefined);
  const [podOpen, setPodOpen] = useState(false);
  const [signedBy, setSignedBy] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(clientDb(), `organizations/${org.id}/deliveries/${id}`);
    return onSnapshot(ref, (snap) => setDelivery(snap.exists() ? (snap.data() as Delivery) : null));
  }, [org.id, id]);

  async function updateStatus(status: DeliveryStatus, extra?: Record<string, unknown>) {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Could not update delivery");
      }
      push("success", `Marked ${status.replace("_", " ")}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handlePodSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateStatus("delivered", { signedBy, proofOfDeliveryUrl: signatureUrl });
    setPodOpen(false);
  }

  if (delivery === undefined) return null;
  if (delivery === null) {
    return (
      <div>
        <TopBar title="Delivery not found" />
        <div className="p-6">
          <Link href="/deliveries" className="text-sm font-semibold text-brand">
            <ArrowLeft className="mr-1 inline" size={14} /> Back to Deliveries
          </Link>
        </div>
      </div>
    );
  }

  const canManage = canManageFleet(member.role);

  return (
    <div>
      <TopBar title={`#${delivery.trackingCode}`} subtitle={delivery.recipientName} />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/deliveries" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Deliveries
        </Link>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <StatusPill status={delivery.status} />
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{delivery.priority.replace("_", " ")}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-ink-muted" />
              <div>
                <p className="text-base font-bold text-ink">{delivery.destinationAddress}</p>
                <p className="text-sm text-ink-muted">{delivery.recipientName}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-outline-variant pt-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <Package size={13} /> {delivery.parcelCount} parcel{delivery.parcelCount > 1 ? "s" : ""}
              </span>
              {delivery.eta && <span>ETA {formatTime(delivery.eta)}</span>}
              {delivery.coldChainTempC != null && (
                <span className="flex items-center gap-1">
                  <Thermometer size={13} /> {delivery.coldChainTempC}°C (cold-chain)
                </span>
              )}
              {delivery.signedBy && <span>Signed: {delivery.signedBy}</span>}
            </div>
          </CardBody>
        </Card>

        {/* Journey */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Live Journey Timeline</h2>
          <Card>
            <CardBody>
              <ol className="space-y-0">
                {delivery.journey.map((ev, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cx("flex h-4 w-4 items-center justify-center rounded-full", i === delivery.journey.length - 1 ? "bg-transit text-white" : "bg-delivered text-white")}>
                        <CheckCircle2 size={12} />
                      </span>
                      {i < delivery.journey.length - 1 && <span className="h-full w-0.5 flex-1 bg-delivered" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-semibold text-ink">{ev.label}</p>
                      <p className="text-xs text-ink-muted">{formatTime(ev.at)}</p>
                      {ev.note && <p className="text-xs text-ink-muted">{ev.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </section>

        {error && <p className="text-sm font-medium text-critical">{error}</p>}

        {canManage && delivery.status !== "delivered" && (
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            {delivery.status === "pending" && (
              <Button loading={busy === "in_transit"} onClick={() => updateStatus("in_transit")}>
                Mark Out for Delivery
              </Button>
            )}
            {delivery.status !== "in_transit" && delivery.status !== "pending" ? null : (
              <Button variant="secondary" loading={busy === "delayed"} onClick={() => updateStatus("delayed", { note: "Marked delayed by dispatch" })}>
                Mark Delayed
              </Button>
            )}
            <Button variant="danger" loading={busy === "exception"} onClick={() => updateStatus("exception", { note: "Exception flagged by dispatch" })}>
              <AlertTriangle size={15} /> Flag Exception
            </Button>
            {delivery.status === "in_transit" && (
              <Button
                onClick={() => {
                  setSignedBy(delivery.recipientName);
                  setPodOpen(true);
                }}
              >
                Capture Proof of Delivery
              </Button>
            )}
          </div>
        )}
      </div>

      <Sheet open={podOpen} onClose={() => setPodOpen(false)} title="Proof of Delivery">
        <form onSubmit={handlePodSubmit} className="space-y-4">
          <div>
            <Label>Signed By</Label>
            <Input required value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
          </div>
          <div>
            <Label>Recipient Signature</Label>
            <SignaturePad onCapture={setSignatureUrl} />
            {signatureUrl && <p className="mt-1 text-xs font-semibold text-delivered-text">Signature captured ✓</p>}
          </div>
          <Button type="submit" className="w-full" disabled={!signatureUrl}>
            Confirm Delivery
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
