import { PLANS, getPlan } from "@/lib/billing/plans";

describe("billing plans catalog", () => {
  it("includes starter, growth, and enterprise", () => {
    const ids = PLANS.map((p) => p.id);
    expect(ids).toEqual(["starter", "growth", "enterprise"]);
  });

  it("starter is free", () => {
    const starter = getPlan("starter");
    expect(starter?.priceUsd).toBe(0);
    expect(starter?.priceKes).toBe(0);
  });

  it("paid plans have positive USD and KES prices", () => {
    for (const plan of PLANS.filter((p) => p.id !== "starter")) {
      expect(plan.priceUsd).toBeGreaterThan(0);
      expect(plan.priceKes).toBeGreaterThan(0);
    }
  });

  it("getPlan returns undefined for an unknown id", () => {
    expect(getPlan("nonexistent")).toBeUndefined();
  });

  it("each plan's feature list is non-empty", () => {
    for (const plan of PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});
