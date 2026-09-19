"use client";

import { useEffect, useState, useCallback } from "react";
import { query } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, UserPlus, Copy, Trash2, Mail } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { useOrg } from "@/components/providers/OrgProvider";
import { membersCol } from "@/lib/firestore/collections";
import { useLiveCollection } from "@/lib/firestore/useCollection";
import { useToast } from "@/components/ui/Toast";
import { canManageTeam, canRemoveMember, ROLE_LABELS } from "@/lib/auth/roles";
import type { Invite, Role } from "@/types/models";

export default function TeamPage() {
  const { org, member, uid } = useOrg();
  const { push } = useToast();
  const canAdmin = canManageTeam(member.role);
  const { data: members } = useLiveCollection(query(membersCol(org.id)));
  const activeMembers = members.filter((m) => m.status === "active");

  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("dispatcher");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!canAdmin) return;
    const res = await fetch("/api/invites");
    if (res.ok) {
      const body = await res.json();
      setInvites(body.invites);
    }
  }, [canAdmin]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("invite");
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not send invite");
      const link = `${window.location.origin}${body.link}`;
      await navigator.clipboard?.writeText(link).catch(() => {});
      push("success", "Invite link copied to clipboard — share it with your teammate.");
      setEmail("");
      setInviteOpen(false);
      loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(targetUid: string, newRole: Role) {
    setBusy(targetUid);
    try {
      const res = await fetch(`/api/members/${targetUid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error);
      }
      push("success", "Role updated.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not update role");
    } finally {
      setBusy(null);
    }
  }

  async function removeMember(targetUid: string) {
    setBusy(targetUid);
    try {
      const res = await fetch(`/api/members/${targetUid}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error);
      }
      push("success", "Member removed.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setBusy(null);
    }
  }

  function copyInviteLink(id: string) {
    const link = `${window.location.origin}/invite/${id}`;
    navigator.clipboard?.writeText(link);
    push("success", "Invite link copied.");
  }

  return (
    <div>
      <TopBar title="Team" subtitle={`${activeMembers.length} members`} />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Settings
        </Link>

        {canAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} /> Invite Teammate
          </Button>
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold text-ink">Members</h2>
          <Card>
            <ul className="divide-y divide-outline-variant">
              {activeMembers.map((m) => {
                const isSelf = m.uid === uid;
                const allowedRemove = canAdmin && canRemoveMember(member.role, m.role, isSelf, m.role === "owner");
                return (
                  <li key={m.uid} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={m.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {m.name} {isSelf && <span className="text-ink-muted font-normal">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{m.email}</p>
                    </div>
                    {canAdmin && m.role !== "owner" ? (
                      <Select
                        value={m.role}
                        disabled={busy === m.uid}
                        onChange={(e) => changeRole(m.uid, e.target.value as Role)}
                        className="h-9 w-32 text-xs"
                      >
                        <option value="admin">Admin</option>
                        <option value="dispatcher">Dispatcher</option>
                        <option value="driver">Driver</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                    ) : (
                      <span className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-bold text-ink-muted">
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}
                    {allowedRemove && (
                      <button
                        onClick={() => removeMember(m.uid)}
                        disabled={busy === m.uid}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-critical hover:bg-critical-bg"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>

        {canAdmin && invites.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-ink">Pending Invites</h2>
            <Card>
              <ul className="divide-y divide-outline-variant">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-ink-muted">
                      <Mail size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{inv.email}</p>
                      <p className="text-xs text-ink-muted">{ROLE_LABELS[inv.role]} · pending</p>
                    </div>
                    <button
                      onClick={() => copyInviteLink(inv.id)}
                      className="flex items-center gap-1 rounded-control border border-outline-variant px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-surface-container"
                    >
                      <Copy size={12} /> Copy Link
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>

      <Sheet open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Teammate">
        <form onSubmit={sendInvite} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="admin">Admin</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="driver">Driver</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" loading={busy === "invite"} className="w-full">
            Send Invite
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
