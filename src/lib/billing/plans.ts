// Shared plan catalog — single source of truth for both the pricing UI and
// the checkout API route, so the price a user sees is exactly the price
// charged server-side (never trust a client-supplied amount for payment).
//
// Two currencies because IntaSend's Checkout API takes one currency per
// charge: KES for M-Pesa STK Push (Kenya-only), USD for card payments
// (works globally, including Kenya). The UI lets the org pick either.

export type PlanId = "starter" | "growth" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceUsd: number;
  priceKes: number;
  seats: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Small fleets getting off spreadsheets",
    priceUsd: 0,
    priceKes: 0,
    seats: "Up to 3 team members",
    features: ["Live GPS tracking", "Manual route planning", "CSV export"],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Growing dispatch operations",
    priceUsd: 39,
    priceKes: 5200,
    seats: "Up to 15 team members",
    features: ["Everything in Starter", "Route optimization", "Audit log", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-depot logistics operations",
    priceUsd: 129,
    priceKes: 17200,
    seats: "Unlimited team members",
    features: ["Everything in Growth", "Dedicated onboarding", "Custom SLAs"],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
