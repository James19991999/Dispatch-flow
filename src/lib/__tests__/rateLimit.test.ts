import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the request once the limit is exceeded", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000);
    const sixth = rateLimit(key, 5, 60_000);
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate buckets independently by key", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(keyA, 3, 60_000);
    expect(rateLimit(keyA, 3, 60_000).allowed).toBe(false);
    expect(rateLimit(keyB, 3, 60_000).allowed).toBe(true);
  });

  it("allows requests again once the window has fully elapsed", () => {
    const key = `test-${Math.random()}`;
    const shortWindow = 10; // ms
    rateLimit(key, 1, shortWindow);
    expect(rateLimit(key, 1, shortWindow).allowed).toBe(false);
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(rateLimit(key, 1, shortWindow).allowed).toBe(true);
        resolve(undefined);
      }, 30);
    });
  });
});
