import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { writeAuditLog, notifyOrg } from "@/lib/firestore/audit";
import type { IntasendCheckout } from "@/types/models";

// IntaSend's webhook model is NOT signature-based like Stripe's (no HMAC
// over the raw body you verify with a secret). Instead, you set a
// "Challenge" string in the IntaSend dashboard once, and every webhook
// delivery includes that same string in the plain JSON body — you check it
// matches. That is a structurally weaker scheme than an HMAC signature (an
// HMAC also proves the sender knew the raw bytes weren't tampered with;
// string-in-body only proves the sender knew the challenge string), so this
// is honestly documented here rather than presented as equivalent to
// Stripe's webhook verification elsewhere in this codebase. Using
// timingSafeEqual at least closes the (minor, low-value) timing side
// channel on the comparison itself.
function verifyChallenge(received: unknown): boolean {
  const expected = process.env.INTASEND_WEBHOOK_CHALLENGE;
  if (!expected || typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface IntasendWebhookBody {
  invoice_id?: string;
  state?: string; // "COMPLETE" | "FAILED" | "PENDING" | ...
  api_ref?: string;
  challenge?: string;
  value?: string | number;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as IntasendWebhookBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!verifyChallenge(body.challenge)) {
    // Deliberately generic response — don't tell a probing caller whether
    // the challenge was close or which part of validation failed.
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  const apiRef = body.api_ref;
  if (!apiRef) {
    return NextResponse.json({ error: "Missing api_ref" }, { status: 400 });
  }

  try {
    const db = adminDb();
    const checkoutRef = db.doc(`intasendCheckouts/${apiRef}`);
    const checkoutSnap = await checkoutRef.get();
    if (!checkoutSnap.exists) {
      // Unknown api_ref — nothing in this app created that checkout. Ack
      // with 200 so IntaSend doesn't retry forever, but do nothing further.
      return NextResponse.json({ ok: true, note: "unknown api_ref" });
    }
    const checkout = checkoutSnap.data() as IntasendCheckout;

    // Idempotency: IntaSend can redeliver the same webhook. If this
    // checkout was already marked completed (by a prior delivery), treat
    // this as a no-op rather than upgrading the plan / logging twice —
    // matches the same invoice-id-matching idempotency pattern used for
    // Stripe webhooks elsewhere in this line of work.
    if (checkout.status === "completed") {
      return NextResponse.json({ ok: true, note: "already processed" });
    }

    const state = (body.state ?? "").toUpperCase();
    if (state === "COMPLETE" || state === "COMPLETED") {
      await db.runTransaction(async (tx) => {
        tx.update(checkoutRef, {
          status: "completed",
          invoiceId: body.invoice_id ?? checkout.invoiceId,
          updatedAt: new Date().toISOString(),
        });
        tx.update(db.doc(`organizations/${checkout.orgId}`), { planTier: checkout.planId });
      });

      await writeAuditLog({
        orgId: checkout.orgId,
        actorUid: "system:intasend",
        actorName: "IntaSend",
        action: "billing.plan_upgraded",
        targetType: "organization",
        targetId: checkout.orgId,
        detail: `${checkout.planId} plan, ${checkout.currency} ${checkout.amount} (invoice ${body.invoice_id ?? "unknown"})`,
      });

      await notifyOrg({
        orgId: checkout.orgId,
        kind: "billing",
        title: "Plan upgraded",
        body: `Payment received — your organization is now on the ${checkout.planId} plan.`,
        link: "/settings",
      });
    } else if (state === "FAILED") {
      await checkoutRef.update({ status: "failed", updatedAt: new Date().toISOString() });
      await writeAuditLog({
        orgId: checkout.orgId,
        actorUid: "system:intasend",
        actorName: "IntaSend",
        action: "billing.payment_failed",
        targetType: "organization",
        targetId: checkout.orgId,
        detail: `${checkout.planId} plan, ${checkout.currency} ${checkout.amount}`,
      });
    }
    // Any other state (e.g. PENDING) — nothing to do yet, wait for the next delivery.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    // 500 here is correct (not 503-and-swallow like the public auth routes):
    // IntaSend should retry a failed webhook delivery, and returning success
    // on a genuine processing error would silently drop a real payment event.
    return NextResponse.json({ error: "Could not process webhook" }, { status: 500 });
  }
}
