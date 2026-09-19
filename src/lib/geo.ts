// Lightweight, dependency-free "geocoding" stand-in.
//
// No geocoding provider (Mapbox, OpenCage, Google Geocoding) is wired into
// this build — see README "Known gaps" for why (a provider/key choice is a
// business decision, not a default to guess). Until one is added, every
// delivery's map position is a deterministic pseudo-random offset from the
// org's depot coordinates, seeded from its own address string so the same
// address always lands in the same spot (stable across reloads, not just
// random noise). This is enough to make the Live GPS and Route Optimization
// maps fully functional for demoing and testing the product, but it is not
// real geocoding — swap `offsetFromDepot` for a real provider call before
// using actual customer addresses in production.

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function offsetFromDepot(
  depotLat: number,
  depotLng: number,
  seed: string,
  maxOffsetDeg = 0.06
): { lat: number; lng: number } {
  const h = hashString(seed);
  const a = ((h % 1000) / 1000) * 2 - 1; // -1..1
  const b = (((h >> 10) % 1000) / 1000) * 2 - 1;
  return {
    lat: depotLat + a * maxOffsetDeg,
    lng: depotLng + b * maxOffsetDeg,
  };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
