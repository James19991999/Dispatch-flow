import { optimizeStopOrder, estimateSavings } from "@/lib/routeOptimizer";
import type { Delivery } from "@/types/models";

function makeDelivery(overrides: Partial<Delivery>): Delivery {
  return {
    id: overrides.id ?? "d1",
    orgId: "org1",
    trackingCode: "DF-1000",
    recipientName: "Test Recipient",
    destinationAddress: "Somewhere",
    status: "pending",
    priority: "standard",
    parcelCount: 1,
    journey: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "u1",
    ...overrides,
  };
}

const depot = { lat: 0, lng: 0 };

describe("optimizeStopOrder", () => {
  it("includes every delivery id exactly once in the ordered output", () => {
    const deliveries = [
      makeDelivery({ id: "a", lat: 0.01, lng: 0.01 }),
      makeDelivery({ id: "b", lat: 0.05, lng: 0.05 }),
      makeDelivery({ id: "c", lat: -0.02, lng: 0.03 }),
    ];
    const { orderedIds } = optimizeStopOrder(depot, deliveries, { medicalColdChainFirst: false });
    expect(orderedIds.sort()).toEqual(["a", "b", "c"].sort());
  });

  it("never produces a worse (longer) route than the original ordering", () => {
    const deliveries = [
      makeDelivery({ id: "far", lat: 0.09, lng: 0.09 }),
      makeDelivery({ id: "near", lat: 0.01, lng: 0.01 }),
      makeDelivery({ id: "mid", lat: 0.05, lng: 0.05 }),
    ];
    const { kmBefore, kmAfter } = optimizeStopOrder(depot, deliveries, { medicalColdChainFirst: false });
    expect(kmAfter).toBeLessThanOrEqual(kmBefore);
  });

  it("sequences cold-chain/medical deliveries before standard ones when the constraint is on", () => {
    const deliveries = [
      makeDelivery({ id: "standard-close", priority: "standard", lat: 0.005, lng: 0.005 }),
      makeDelivery({ id: "medical-far", priority: "medical", lat: 0.08, lng: 0.08 }),
    ];
    const { orderedIds } = optimizeStopOrder(depot, deliveries, { medicalColdChainFirst: true });
    expect(orderedIds[0]).toBe("medical-far");
    expect(orderedIds[1]).toBe("standard-close");
  });

  it("appends deliveries with no coordinates at the end, unordered by distance", () => {
    const deliveries = [
      makeDelivery({ id: "with-coords", lat: 0.02, lng: 0.02 }),
      makeDelivery({ id: "no-coords", lat: null, lng: null }),
    ];
    const { orderedIds } = optimizeStopOrder(depot, deliveries, { medicalColdChainFirst: false });
    expect(orderedIds).toContain("no-coords");
    expect(orderedIds[orderedIds.length - 1]).toBe("no-coords");
  });
});

describe("estimateSavings", () => {
  it("returns zero savings when the optimized route is not shorter", () => {
    expect(estimateSavings(10, 10)).toEqual({ milesSaved: 0, minutesSaved: 0, fuelSavedGal: 0 });
    expect(estimateSavings(10, 12)).toEqual({ milesSaved: 0, minutesSaved: 0, fuelSavedGal: 0 });
  });

  it("converts a positive km reduction into positive miles/minutes/fuel savings", () => {
    const savings = estimateSavings(50, 40);
    expect(savings.milesSaved).toBeGreaterThan(0);
    expect(savings.minutesSaved).toBeGreaterThan(0);
    expect(savings.fuelSavedGal).toBeGreaterThan(0);
  });
});
