import "server-only";

// Direct fetch wrapper around IntaSend's Checkout API — deliberately not the
// community `intasend-node` package, to keep the payment code path auditable
// in this repo rather than depending on an unaudited third-party SDK for
// something this security-sensitive.
//
// IntaSend docs: https://developers.intasend.com/docs/checkout-api
// Sandbox base:  https://sandbox.intasend.com
// Live base:     https://payment.intasend.com

const INTASEND_BASE_URL = process.env.INTASEND_LIVE === "true" ? "https://payment.intasend.com" : "https://sandbox.intasend.com";

export function isIntasendConfigured(): boolean {
  return Boolean(process.env.INTASEND_PUBLISHABLE_KEY && process.env.INTASEND_SECRET_KEY);
}

export interface CreateCheckoutInput {
  amount: number;
  currency: "KES" | "USD";
  email: string;
  apiRef: string;
  firstName: string;
  redirectUrl: string;
  /** Restrict to a single method so the checkout page doesn't show options
   *  that don't make sense for the chosen currency (M-Pesa is KES-only). */
  method?: "M-PESA" | "CARD-PAYMENT";
}

export interface CheckoutResult {
  url: string;
  apiRef: string;
  invoiceId: string;
}

/**
 * Creates a hosted IntaSend checkout session and returns the URL to redirect
 * the payer to. IntaSend's checkout payload has no free-form metadata field
 * the way Stripe's does, so the caller (the checkout API route) is
 * responsible for persisting a short-lived apiRef → {orgId, planId} lookup
 * record before redirecting, which the webhook route reads back.
 */
export async function createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
  const secretKey = process.env.INTASEND_SECRET_KEY;
  const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    throw new Error("IntaSend is not configured — set INTASEND_PUBLISHABLE_KEY and INTASEND_SECRET_KEY");
  }

  const res = await fetch(`${INTASEND_BASE_URL}/api/v1/checkout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      public_key: publishableKey,
      amount: input.amount,
      currency: input.currency,
      email: input.email,
      first_name: input.firstName,
      api_ref: input.apiRef,
      redirect_url: input.redirectUrl,
      ...(input.method ? { method: input.method } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`IntaSend checkout creation failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { url?: string; id?: string };
  if (!data.url || !data.id) {
    throw new Error("IntaSend checkout response missing url/id");
  }

  return { url: data.url, apiRef: input.apiRef, invoiceId: data.id };
}
