"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CreditCard, Smartphone } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useOrg } from "@/components/providers/OrgProvider";
import { useToast } from "@/components/ui/Toast";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { cx } from "@/lib/utils";

// Owner-only: the checkout route is owner-gated server-side too, but hiding
// the buttons for non-owners avoids a confusing 403 for admins/dispatchers
// who open this page.
function BillingContent() {
  const { org, member } = useOrg();
  const { push } = useToast();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const isOwner = member.role === "owner";

  useEffect(() => {
    const checkoutRef = searchParams.get("checkout");
    if (checkoutRef) {
      push("success", "Thanks — if your payment went through, your plan will update within a few seconds.");
    }
  }, [searchParams, push]);

  async function startCheckout(planId: PlanId, currency: "KES" | "USD") {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/billing/intasend-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, currency }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start checkout");
      window.location.href = body.url;
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Something went wrong");
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <TopBar title="Billing" subtitle="Plans & payment" />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-3xl">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Settings
        </Link>

        {!isOwner && (
          <Card className="border-pending/30 bg-pending-bg">
            <CardBody>
              <p className="text-sm text-ink">Only the organization owner can change plans. Ask your owner to upgrade from this page.</p>
            </CardBody>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = org.planTier === plan.id;
            return (
              <Card key={plan.id} className={cx(isCurrent && "border-brand ring-1 ring-brand")}>
                <CardBody className="flex h-full flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">{plan.name}</h3>
                      {isCurrent && <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">Current</span>}
                    </div>
                    <p className="text-xs text-ink-muted">{plan.tagline}</p>
                  </div>

                  <div>
                    {plan.priceUsd === 0 ? (
                      <p className="text-2xl font-bold text-ink">Free</p>
                    ) : (
                      <p className="text-2xl font-bold text-ink">
                        ${plan.priceUsd}
                        <span className="text-sm font-normal text-ink-muted">/mo</span>
                      </p>
                    )}
                    {plan.priceKes > 0 && <p className="text-xs text-ink-muted">or KES {plan.priceKes.toLocaleString()}/mo</p>}
                    <p className="mt-1 text-xs text-ink-muted">{plan.seats}</p>
                  </div>

                  <ul className="flex-1 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-ink">
                        <Check size={13} className="mt-0.5 shrink-0 text-brand" /> {f}
                      </li>
                    ))}
                  </ul>

                  {plan.id === "starter" ? (
                    <Button variant="secondary" size="sm" disabled className="w-full">
                      {isCurrent ? "Current plan" : "Included"}
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="secondary" size="sm" disabled className="w-full">
                      Current plan
                    </Button>
                  ) : isOwner ? (
                    <div className="space-y-1.5">
                      <Button
                        size="sm"
                        className="w-full"
                        loading={loadingPlan === plan.id}
                        onClick={() => startCheckout(plan.id, "USD")}
                      >
                        <CreditCard size={14} /> Pay with card
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        loading={loadingPlan === plan.id}
                        onClick={() => startCheckout(plan.id, "KES")}
                      >
                        <Smartphone size={14} /> Pay with M-Pesa
                      </Button>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-ink-muted">
          Payments are processed by IntaSend. Card and M-Pesa checkouts are one-time charges — plans don&apos;t auto-renew from this build; upgrade again next month or ask us about recurring billing.
        </p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}
