// No geocoding provider is wired in (see geo.ts), so a brand-new organization
// has no depot coordinates and Live GPS / Route Optimization would refuse to
// work until an admin typed them into Settings. Start every org at the city
// centre for its timezone instead; admins can refine it in Settings.
const CITY_CENTRES: Record<string, { lat: number; lng: number }> = {
  "Africa/Nairobi": { lat: -1.2921, lng: 36.8219 },
  "Africa/Lagos": { lat: 6.5244, lng: 3.3792 },
  "Africa/Johannesburg": { lat: -26.2041, lng: 28.0473 },
  "Africa/Cairo": { lat: 30.0444, lng: 31.2357 },
  "Europe/London": { lat: 51.5072, lng: -0.1276 },
  "America/New_York": { lat: 40.7128, lng: -74.006 },
  "America/Los_Angeles": { lat: 34.0522, lng: -118.2437 },
  "Asia/Dubai": { lat: 25.2048, lng: 55.2708 },
};

export function defaultDepotFor(timezone: string): { lat: number; lng: number } | null {
  return CITY_CENTRES[timezone] ?? null;
}
