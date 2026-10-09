// Real address lookup. Server-only (called from API routes).
//  - If MAPBOX_ACCESS_TOKEN is set, Mapbox Geocoding is used (recommended for
//    production volume).
//  - Otherwise OpenStreetMap Nominatim is used. It is free but its usage policy
//    allows light use only (about 1 request/second); fine for getting started.
// Returns null on any failure so callers can fall back to the depot offset
// instead of failing the whole request.
import type { LatLng } from "@/lib/geo";

const TIMEOUT_MS = 4000;

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function geocodeAddress(address: string, near?: LatLng | null): Promise<LatLng | null> {
  const query = address.trim();
  if (query.length < 3) return null;
  try {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (token) {
      const prox = near ? `&proximity=${near.lng},${near.lat}` : "";
      const data = (await fetchJson(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${token}${prox}`
      )) as { features?: { center?: [number, number] }[] } | null;
      const c = data?.features?.[0]?.center;
      return c && Number.isFinite(c[0]) && Number.isFinite(c[1]) ? { lat: c[1], lng: c[0] } : null;
    }
    // Nominatim: bias (not restrict) results toward the depot's neighbourhood.
    let view = "";
    if (near) {
      const d = 1.5; // degrees, roughly a metro area
      view = `&viewbox=${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`;
    }
    const data = (await fetchJson(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}${view}`,
      { "User-Agent": "DispatchFlow/1.0 (jamesmaruti560@gmail.com)", Accept: "application/json" }
    )) as { lat?: string; lon?: string }[] | null;
    const hit = data?.[0];
    const lat = hit ? Number(hit.lat) : NaN;
    const lng = hit ? Number(hit.lon) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
