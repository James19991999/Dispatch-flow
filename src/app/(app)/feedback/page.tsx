"use client";

import { useMemo, useState } from "react";
import { query, orderBy } from "firebase/firestore";
import { Star, MessageSquareHeart, Flag, Send, Sparkles } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { Textarea } from "@/components/ui/Field";
import { useOrg } from "@/components/providers/OrgProvider";
import { reviewsCol, driversCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime, cx } from "@/lib/utils";
import { canManageFleet } from "@/lib/auth/roles";
import type { Review } from "@/types/models";

const FILTERS = ["All Reviews", "Unreplied", "Flagged"] as const;

export default function FeedbackPage() {
  const { org, member } = useOrg();
  const { push } = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All Reviews");
  const [responding, setResponding] = useState<Review | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: reviews, loading } = useLiveCollection(query(reviewsCol(org.id), orderBy("createdAt", "desc")));
  const { data: drivers } = useLiveCollection(query(driversCol(org.id)));

  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, positivePct: 0, unaddressed: 0 };
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const positive = reviews.filter((r) => r.rating >= 4).length;
    const unaddressed = reviews.filter((r) => r.status === "unreplied").length;
    return { avg: Math.round(avg * 10) / 10, positivePct: Math.round((positive / reviews.length) * 100), unaddressed };
  }, [reviews]);

  const filtered = useMemo(() => {
    if (filter === "Unreplied") return reviews.filter((r) => r.status === "unreplied");
    if (filter === "Flagged") return reviews.filter((r) => r.status === "flagged");
    return reviews;
  }, [reviews, filter]);

  async function respond(e: React.FormEvent) {
    e.preventDefault();
    if (!responding) return;
    setBusy("respond");
    try {
      const res = await fetch(`/api/reviews/${responding.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Could not send response");
      push("success", "Response delivered to recipient via SMS/Email!");
      setResponding(null);
      setMessage("");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function flag(id: string) {
    setBusy(id + "-flag");
    try {
      await fetch(`/api/reviews/${id}/flag`, { method: "POST" });
      push("success", "Flagged to Dispatch!");
    } finally {
      setBusy(null);
    }
  }

  async function gratitude(id: string) {
    setBusy(id + "-gratitude");
    try {
      await fetch(`/api/reviews/${id}/gratitude`, { method: "POST" });
      push("success", "Gratitude sent to recipient!");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <TopBar title="Customer Feedback" subtitle="Voice of the Customer" />
      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="space-y-1 text-center">
              <p className="text-2xl font-extrabold tabular-nums text-ink">{stats.avg || "—"}</p>
              <p className="text-[10px] font-bold uppercase text-ink-muted">Overall Fleet CSAT</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-1 text-center">
              <p className="text-2xl font-extrabold tabular-nums text-ink">{stats.positivePct}%</p>
              <p className="text-[10px] font-bold uppercase text-ink-muted">Positive</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-1 text-center">
              <p className="text-2xl font-extrabold tabular-nums text-ink">{stats.unaddressed}</p>
              <p className="text-[10px] font-bold uppercase text-ink-muted">Unaddressed</p>
            </CardBody>
          </Card>
        </div>

        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                "rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                filter === f ? "bg-brand text-white" : "bg-surface-container text-ink-muted"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {!loading && filtered.length === 0 ? (
          <EmptyState icon={<MessageSquareHeart size={22} />} title="No reviews here" description="Recipient feedback will appear here as deliveries are completed." />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((r) => {
              const driver = drivers.find((d) => d.id === r.driverId);
              return (
                <Card key={r.id}>
                  <CardBody className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-ink">{r.recipientName}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={13} className={i < r.rating ? "fill-pending text-pending" : "text-outline-variant"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-ink-muted">{r.comment}</p>
                    <p className="text-xs text-ink-muted">
                      Driver: {driver?.name ?? "Unassigned"} · {formatRelativeTime(r.createdAt)}
                    </p>
                    {r.response && (
                      <p className="rounded-control bg-surface-container-low px-3 py-2 text-xs text-ink-muted">
                        <span className="font-bold text-ink">Your reply: </span>
                        {r.response}
                      </p>
                    )}
                    {canManageFleet(member.role) && r.status !== "responded" && (
                      <div className="flex flex-wrap gap-2 border-t border-outline-variant pt-2.5">
                        <Button size="sm" variant="secondary" onClick={() => setResponding(r)}>
                          <Send size={13} /> Respond
                        </Button>
                        {r.rating >= 4 ? (
                          <Button size="sm" variant="secondary" loading={busy === r.id + "-gratitude"} onClick={() => gratitude(r.id)}>
                            <Sparkles size={13} /> Send Gratitude
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" loading={busy === r.id + "-flag"} onClick={() => flag(r.id)} disabled={r.status === "flagged"}>
                            <Flag size={13} /> {r.status === "flagged" ? "Flagged" : "Flag to Dispatch"}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!responding} onClose={() => setResponding(null)} title={`Respond to ${responding?.recipientName ?? ""}`}>
        <form onSubmit={respond} className="space-y-4">
          <Textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thanks for the feedback — we'll..." />
          <Button type="submit" loading={busy === "respond"} className="w-full">
            <Send size={14} /> Send via SMS/Email
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
