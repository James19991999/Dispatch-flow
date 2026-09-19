"use client";

import Link from "next/link";
import { ArrowLeft, Mail, HelpCircle } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";

const FAQS = [
  {
    q: "How do I add a driver or vehicle?",
    a: "Go to Settings → Drivers or Vehicles and use Add Driver / Add Vehicle. Dispatchers and above can add fleet resources.",
  },
  {
    q: "Why can't I see the Live GPS map?",
    a: "The map needs depot coordinates. An admin can set them in Settings → Organization → Depot Latitude/Longitude.",
  },
  {
    q: "How does route optimization work?",
    a: "DispatchFlow sequences stops with a nearest-neighbor algorithm from your depot, optionally prioritizing cold-chain and medical deliveries first. Re-optimize any time traffic or stops change.",
  },
  {
    q: "Can I remove the organization's owner?",
    a: "No — there's no ownership-transfer flow yet, so the owner role can't be changed or removed to avoid orphaning the organization.",
  },
  {
    q: "How do teammates join my organization?",
    a: "Invite them from Settings → Team. You'll get a link to share directly — no email delivery is wired up yet, so send it yourself via chat, SMS or email.",
  },
];

export default function HelpPage() {
  return (
    <div>
      <TopBar title="Help & Support" />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="space-y-3">
          {FAQS.map((f) => (
            <Card key={f.q}>
              <CardBody className="space-y-1.5">
                <p className="flex items-start gap-2 text-sm font-bold text-ink">
                  <HelpCircle size={15} className="mt-0.5 shrink-0 text-brand" /> {f.q}
                </p>
                <p className="pl-[23px] text-sm text-ink-muted">{f.a}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card>
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Still stuck?</p>
              <p className="text-xs text-ink-muted">Reach dispatch support directly.</p>
            </div>
            <a href="mailto:support@dispatchflow.app" className="flex items-center gap-1.5 rounded-control border border-outline-variant px-3 py-2 text-xs font-bold text-ink hover:bg-surface-container">
              <Mail size={13} /> Email Support
            </a>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
