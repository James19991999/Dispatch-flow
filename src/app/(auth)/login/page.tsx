"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Fingerprint, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Field";
import { signInWithPassword } from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // A server component rejected our session cookie: clear it so the user can
  // sign in again instead of looping between /login and /dashboard.
  useEffect(() => {
    if (params.get("reason")) {
      fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    }
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      const next = params.get("next") || "/dashboard";
      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(
        message.includes("invalid-credential") || message.includes("wrong-password") || message.includes("user-not-found")
          ? "Incorrect email or password."
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-white/10 bg-[#111a2e] p-6 shadow-2xl">
      <h1 className="text-xl font-bold text-white">Sign In to Dispatch</h1>
      <p className="mt-1 text-sm text-slate-400">Central Hub · authenticate to view live fleet operations.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label className="text-slate-400">Work Email or Fleet ID</Label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-400">Password</Label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-brand"
            />
            Remember this terminal
          </label>
          <Link href="/forgot-password" className="font-semibold text-[#93b4f7] hover:text-white">
            Forgot?
          </Link>
        </div>

        <FieldError>{error}</FieldError>

        <Button type="submit" loading={loading} className="w-full">
          Sign In <span aria-hidden>→</span>
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-white/10" />
        or verify with
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        disabled
        title="Passkey / biometric sign-in is on the roadmap — requires WebAuthn enrollment per device, not yet wired up"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-control border border-white/10 bg-white/5 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed"
      >
        <Fingerprint size={16} />
        Face ID / Touch Access
        <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">Soon</span>
      </button>

      <p className="mt-6 text-center text-sm text-slate-400">
        New fleet?{" "}
        <Link href="/onboarding" className="font-semibold text-[#93b4f7] hover:text-white">
          Set up your organization
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
