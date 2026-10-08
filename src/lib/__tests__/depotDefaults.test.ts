import { defaultDepotFor } from "../depotDefaults";

describe("defaultDepotFor", () => {
  it("returns Nairobi city centre for Africa/Nairobi", () => {
    expect(defaultDepotFor("Africa/Nairobi")).toEqual({ lat: -1.2921, lng: 36.8219 });
  });
  it("returns null for an unknown timezone", () => {
    expect(defaultDepotFor("Mars/Olympus")).toBeNull();
  });
  it("covers every timezone offered in onboarding", () => {
    for (const tz of ["Africa/Nairobi", "Africa/Lagos", "Africa/Johannesburg", "Africa/Cairo", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai"]) {
      expect(defaultDepotFor(tz)).not.toBeNull();
    }
  });
});
