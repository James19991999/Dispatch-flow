import "server-only";

// In-memory sliding-window rate limiter. Storage-agnostic interface so a
// distributed backend (Upstash Redis, etc.) can be swapped in later for a
// multi-instance deployment without touching call sites — documented here
// rather than built, since which provider is a hosting/cost decision.
//
// Known limitation: state is per server instance/process. On Vercel's
// serverless functions each cold-started instance has its own counters, so
// this is a real but soft limit (a burst spread across many instances can
// exceed it), not a hard guarantee. It still stops the common case — a
// single client hammering one endpoint — and is honest in its own naming.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so long-lived processes don't leak memory from one-off
// callers that never come back.
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((bucket, key) => {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * @param key       Unique bucket key — typically `${routeName}:${uid or ip}`.
 * @param limit     Max requests allowed within `windowMs`.
 * @param windowMs  Sliding window size in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep(windowMs);
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { allowed: false, remaining: 0, limit, retryAfterSeconds };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, limit, retryAfterSeconds: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
