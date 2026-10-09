import { geocodeAddress } from "../geocode";
import { TIMEZONES } from "../timezones";
import { defaultDepotFor } from "../depotDefaults";

afterEach(() => {
  
  delete process.env.MAPBOX_ACCESS_TOKEN;
});

describe("geocodeAddress", () => {
  it("uses Nominatim without a Mapbox token", async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ lat: "-1.30", lon: "36.80" }] });
    (global as any).fetch = f;
    const r = await geocodeAddress("Kenyatta Avenue, Nairobi", { lat: -1.29, lng: 36.82 });
    expect(r).toEqual({ lat: -1.3, lng: 36.8 });
    expect(String(f.mock.calls[0][0])).toContain("nominatim.openstreetmap.org");
  });
  it("uses Mapbox when a token is set", async () => {
    process.env.MAPBOX_ACCESS_TOKEN = "t";
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{ center: [3.4, 6.5] }] }) });
    expect(await geocodeAddress("Allen Avenue, Lagos")).toEqual({ lat: 6.5, lng: 3.4 });
  });
  it("returns null on failure, no match or short input", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("down"));
    expect(await geocodeAddress("somewhere")).toBeNull();
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    expect(await geocodeAddress("nowhere at all")).toBeNull();
    expect(await geocodeAddress("ab")).toBeNull();
  });
});

describe("timezones", () => {
  it("every offered timezone has a default depot", () => {
    for (const tz of TIMEZONES) expect(defaultDepotFor(tz)).not.toBeNull();
  });
});
