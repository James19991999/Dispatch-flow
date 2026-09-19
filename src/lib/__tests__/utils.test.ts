import { initials, formatRelativeTime } from "@/lib/utils";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Elena Rostova")).toBe("ER");
  });

  it("uppercases lowercase input", () => {
    expect(initials("marcus vance")).toBe("MV");
  });

  it("handles a single name", () => {
    expect(initials("Cher")).toBe("C");
  });

  it("returns an empty string for empty input", () => {
    expect(initials("")).toBe("");
  });
});

describe("formatRelativeTime", () => {
  it("reports 'just now' for the current instant", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("just now");
  });

  it("reports minutes ago for a recent timestamp", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("reports hours ago for an older timestamp", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("reports days ago for a much older timestamp", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
  });
});
