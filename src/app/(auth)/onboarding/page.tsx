"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Mail, Lock, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Field";
import { signUpWithPassword, signInWithPassword, establishSessionCookie } from "@/lib/auth/client";
import { clientAuth } from "@/lib/firebase/client";

const TIMEZONES = [
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasAccount, setHasAccount] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [depotName, setDepotName] = useState("");
  const [depotAddress, setDepotAddress] = useState("");
  const [timezone, setTimezone] = useState("Africa/Nairobi");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (hasAccount) {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password);
      }
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? humanizeAuthError(err.message) : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleOrgStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = clientAuth().currentUser;
      if (!user) throw new Error("Session expired — please sign in again");
      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/org/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, orgName, depotName, depotAddress, timezone, name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create organization");
      // Refresh the ID token so it carries the new orgId/role custom claims,
      // then mint the session cookie the rest of the app relies on.
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

  return (
    <div className="rounded-card border border-white/10 bg-[#111a2e] p-6 shadow-2xl">
      <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
        <span className={step === 1 ? "text-brand" : ""}>1. Account</span>
        <span className="h-px flex-1 bg-white/10" />
        <span className={step === 2 ? "text-brand" : ""}>2. Organization</span>
      </div>

      {step === 1 ? (
        <form onSubmit={handleAccountStep} className="space-y-4">
          <h1 className="text-xl font-bold text-white">
            {hasAccount ? "Sign in to continue" : "Create your admin account"}
          </h1>
          {!hasAccount && (
            <div>
              <Label className="text-white/60">Your Name</Label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Wanjiru"
                  className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-white/60">Work Email</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
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
            Continue
          </Button>
          <button
            type="button"
            onClick={() => setHasAccount((v) => !v)}
            className="w-full text-center text-sm font-semibold text-white/40 hover:text-white/70"
          >
            {hasAccount ? "New here? Create an account instead" : "Already have an account? Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOrgStep} className="space-y-4">
          <h1 className="text-xl font-bold text-white">Set up your fleet</h1>
          <div>
            <Label className="text-white/60">Organization Name</Label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <Input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="JG Logistics Ltd"
                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
              />
            </div>
          </div>
          <div>
            <Label className="text-white/60">Primary Depot / Hub Name</Label>
            <Input
              required
              value={depotName}
              onChange={(e) => setDepotName(e.target.value)}
              placeholder="Central Hub #01 - Nairobi"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-brand"
            />
          </div>
          <div>
            <Label className="text-white/60">Depot Address</Label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <Input
                required
                value={depotAddress}
                onChange={(e) => setDepotAddress(e.target.value)}
                placeholder="Enterprise Rd, Nairobi"
                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus:border-brand"
              />
            </div>
          </div>
          <div>
            <Label className="text-white/60">Timezone</Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-12 w-full rounded-control border border-white/10 bg-white/5 px-3.5 text-sm text-white focus:border-brand focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-[#111a2e]">
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" loading={loading} className="w-full">
            Launch DispatchFlow
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-white/40">
        <Link href="/login" className="font-semibold text-brand hover:text-brand-light">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function humanizeAuthError(message: string): string {
  if (message.includes("email-already-in-use")) return "An account already exists for this email — try signing in.";
  if (message.includes("weak-password")) return "Password should be at least 8 characters.";
  if (message.includes("invalid-credential") || message.includes("wrong-password")) return "Incorrect email or password.";
  return message;
}
