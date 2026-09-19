"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mail, Lock, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Field";
import { signInWithPassword, signUpWithPassword, establishSessionCookie } from "@/lib/auth/client";
import { clientAuth } from "@/lib/firebase/client";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Role } from "@/types/models";

interface InvitePreview {
  orgName: string;
  email: string;
  role: Role;
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Invite not found");
        setPreview(body);
      })
      .catch((err) => setPreviewError(err.message));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setError(null);
    setLoading(true);
    try {
      if (hasAccount) {
        await signInWithPassword(preview.email, password);
      } else {
        await signUpWithPassword(preview.email, password);
      }
      const user = clientAuth().currentUser;
      if (!user) throw new Error("Session expired");
      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, token, name: hasAccount ? preview.email : name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not accept invite");
      await user.getIdToken(true);
      await establishSessionCookie();
      router.replace("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (previewError) {
    return (
      <div className="rounded-card border border-white/10 bg-[#111a2e] p-6 text-center shadow-2xl">
        <XCircle className="mx-auto mb-3 text-critical" size={32} />
        <h1 className="text-lg font-bold text-white">Invite unavailable</h1>
        <p className="mt-1 text-sm text-white/50">{previewError}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-card border border-white/10 bg-[#111a2e] p-6 shadow-2xl">
        <div className="h-24 animate-pulse rounded-control bg-white/5" />
      </div>
    );
  }

  return (
    <div className="rounded-card border border-white/10 bg-[#111a2e] p-6 shadow-2xl">
      <h1 className="text-xl font-bold text-white">You&apos;re invited to {preview.orgName}</h1>
      <p className="mt-1 text-sm text-white/50">
        Joining as <span className="font-semibold text-brand">{ROLE_LABELS[preview.role]}</span> · {preview.email}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!hasAccount && (
          <div>
            <Label className="text-white/60">Your Name</Label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
              />
            </div>
          </div>
        )}
        <div>
          <Label className="text-white/60">Email</Label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <Input
              disabled
              value={preview.email}
              className="border-white/10 bg-white/5 pl-10 text-white/60"
            />
          </div>
        </div>
        <div>
          <Label className="text-white/60">Password</Label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
            />
          </div>
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" loading={loading} className="w-full">
          {hasAccount ? "Sign in & join" : "Create account & join"}
        </Button>
        <button
          type="button"
          onClick={() => setHasAccount((v) => !v)}
          className="w-full text-center text-sm font-semibold text-white/40 hover:text-white/70"
        >
          {hasAccount ? "New here? Create an account instead" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
