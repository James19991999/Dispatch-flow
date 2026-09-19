"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Field";
import { sendReset } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendReset(email);
      // Always show the same confirmation regardless of whether the email
      // exists — Firebase's client SDK doesn't leak that distinction by
      // default, and this keeps it that way (anti-enumeration).
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-white/10 bg-[#111a2e] p-6 shadow-2xl">
      <Link href="/login" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white/80">
        <ArrowLeft size={14} /> Back to sign in
      </Link>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-delivered-bg text-delivered">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="text-lg font-bold text-white">Check your inbox</h1>
          <p className="text-sm text-slate-400">
            If an account exists for <span className="text-white/80">{email}</span>, a reset link is on its way.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-bold text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-400">We&apos;ll email you a secure link to choose a new one.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label className="text-slate-400">Work Email</Label>
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
            <FieldError>{error}</FieldError>
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
