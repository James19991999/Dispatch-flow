import { offsetFromDepot, haversineKm } from "@/lib/geo";

describe("offsetFromDepot", () => {
  const depot = { lat: -1.2921, lng: 36.8219 };

  it("is deterministic for the same seed", () => {
    const a = offsetFromDepot(depot.lat, depot.lng, "742 Evergreen Terrace");
    const b = offsetFromDepot(depot.lat, depot.lng, "742 Evergreen Terrace");
    expect(a).toEqual(b);
  });

  it("produces different offsets for different seeds", () => {
    const a = offsetFromDepot(depot.lat, depot.lng, "742 Evergreen Terrace");
    const b = offsetFromDepot(depot.lat, depot.lng, "820 Sunset Blvd");
    expect(a).not.toEqual(b);
  });

  it("stays within the requested max offset", () => {
    const maxOffset = 0.05;
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const { lat, lng } = offsetFromDepot(depot.lat, depot.lng, seed, maxOffset);
      expect(Math.abs(lat - depot.lat)).toBeLessThanOrEqual(maxOffset);
      expect(Math.abs(lng - depot.lng)).toBeLessThanOrEqual(maxOffset);
    }
  });
});

describe("haversineKm", () => {
  it("returns ~0 for the same point", () => {
    const p = { lat: -1.2921, lng: 36.8219 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it("matches a known real-world distance (Nairobi to Mombasa, ~440km great-circle)", () => {
    const nairobi = { lat: -1.2921, lng: 36.8219 };
    const mombasa = { lat: -4.0435, lng: 39.6682 };
    const km = haversineKm(nairobi, mombasa);
    expect(km).toBeGreaterThan(400);
    expect(km).toBeLessThan(480);
  });

  it("is symmetric", () => {
    const a = { lat: 10, lng: 10 };
    const b = { lat: 20, lng: 20 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});
