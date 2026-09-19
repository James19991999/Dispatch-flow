import { haversineKm } from "./geo";
import type { Delivery } from "@/types/models";

interface Point {
  lat: number;
  lng: number;
}

function routeDistanceKm(depot: Point, stops: { lat: number; lng: number }[]): number {
  let total = 0;
  let prev = depot;
  for (const s of stops) {
    total += haversineKm(prev, s);
    prev = s;
  }
  return total;
}

/**
 * A real (if simple) nearest-neighbor TSP heuristic, not a canned demo
 * number. When constraints.medicalColdChainFirst is on, cold-chain/medical
 * deliveries are grouped first (each group individually nearest-neighbor
 * ordered from the depot), matching the design system's "Medical &
 * Perishable First" auto-sequencing rule.
 */
export function optimizeStopOrder(
  depot: Point,
  deliveries: Delivery[],
  opts: { medicalColdChainFirst: boolean }
): { orderedIds: string[]; kmBefore: number; kmAfter: number } {
  const withCoords = deliveries.filter(
    (d): d is Delivery & { lat: number; lng: number } => typeof d.lat === "number" && typeof d.lng === "number"
  );

  const kmBefore = routeDistanceKm(depot, withCoords);

  function nearestNeighborOrder(points: (Delivery & { lat: number; lng: number })[]): (Delivery & { lat: number; lng: number })[] {
    const remaining = [...points];
    const ordered: (Delivery & { lat: number; lng: number })[] = [];
    let current: Point = depot;
    while (remaining.length) {
      let bestIdx = 0;
      let bestDist = Infinity;
      remaining.forEach((p, i) => {
        const dist = haversineKm(current, p);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      const [next] = remaining.splice(bestIdx, 1);
      ordered.push(next);
      current = next;
    }
    return ordered;
  }

  let ordered: (Delivery & { lat: number; lng: number })[];
  if (opts.medicalColdChainFirst) {
    const priority = withCoords.filter((d) => d.priority === "cold_chain" || d.priority === "medical");
    const rest = withCoords.filter((d) => !(d.priority === "cold_chain" || d.priority === "medical"));
    ordered = [...nearestNeighborOrder(priority), ...nearestNeighborOrder(rest)];
  } else {
    ordered = nearestNeighborOrder(withCoords);
  }

  const kmAfter = routeDistanceKm(depot, ordered);

  // Deliveries without coordinates (no depot coords set yet) keep their
  // original relative order, appended at the end — they simply can't be
  // distance-optimized without a position.
  const withoutCoords = deliveries.filter((d) => !(typeof d.lat === "number" && typeof d.lng === "number"));

  return {
    orderedIds: [...ordered.map((d) => d.id), ...withoutCoords.map((d) => d.id)],
    kmBefore,
    kmAfter,
  };
}

const AVG_SPEED_KMH = 28; // urban delivery average, used only for the minutes-saved estimate
const FUEL_KM_PER_GAL = 34; // ~14.4 km/L, a typical loaded delivery van

export function estimateSavings(kmBefore: number, kmAfter: number) {
  const kmSaved = Math.max(0, kmBefore - kmAfter);
  const milesSaved = kmSaved * 0.621371;
  const minutesSaved = (kmSaved / AVG_SPEED_KMH) * 60;
  const fuelSavedGal = kmSaved / FUEL_KM_PER_GAL;
  return {
    milesSaved: Math.round(milesSaved * 10) / 10,
    minutesSaved: Math.round(minutesSaved),
    fuelSavedGal: Math.round(fuelSavedGal * 10) / 10,
  };
}
