import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { requireApiSession, apiErrorResponse } from "@/lib/auth/api";
import { createCheckout, isIntasendConfigured } from "@/lib/intasend/client";
import { getPlan } from "@/lib/billing/plans";
import { writeAuditLog } from "@/lib/firestore/audit";
import type { IntasendCheckout } from "@/types/models";

const schema = z.object({
  planId: z.enum(["growth", "enterprise"]),
  currency: z.enum(["KES", "USD"]),
});

// Owner-gated: billing is the one action in this app that moves real money,
// so it gets the narrowest role gate in the codebase (every other mutating
// route uses "admin" or "dispatcher" — this uses "owner").
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession("owner");

    if (!isIntasendConfigured()) {
      return NextResponse.json(
        { error: "Billing isn't configured for this deployment yet — set INTASEND_PUBLISHABLE_KEY and INTASEND_SECRET_KEY." },
        { status: 503 }
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { planId, currency } = parsed.data;

    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }
    if (currency === "KES" && plan.priceKes <= 0) {
      return NextResponse.json({ error: "This plan has no KES price" }, { status: 400 });
    }

    const amount = currency === "KES" ? plan.priceKes : plan.priceUsd;
    const apiRef = `df_${session.org.id}_${randomUUID()}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

    const checkout = await createCheckout({
      amount,
      currency,
      email: session.email,
      firstName: session.member.name.split(" ")[0] || session.member.name,
      apiRef,
      redirectUrl: `${appUrl}/settings/billing?checkout=${apiRef}`,
      method: currency === "KES" ? "M-PESA" : "CARD-PAYMENT",
    });

    // Persisted BEFORE redirecting the payer — the webhook route depends on
    // this record existing to map the eventual payment notification back to
    // an org and plan (see route comment there).
    const record: IntasendCheckout = {
      apiRef,
      orgId: session.org.id,
      orgName: session.org.name,
      planId,
      currency,
      amount,
      status: "pending",
      invoiceId: checkout.invoiceId,
      createdAt: new Date().toISOString(),
    };
    await adminDb().doc(`intasendCheckouts/${apiRef}`).set(record);

    await writeAuditLog({
      orgId: session.org.id,
      actorUid: session.uid,
      actorName: session.member.name,
      action: "billing.checkout_started",
      targetType: "organization",
      targetId: session.org.id,
      detail: `${planId} plan, ${currency} ${amount}`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
