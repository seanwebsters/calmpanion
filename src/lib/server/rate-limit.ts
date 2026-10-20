// In-memory sliding-window rate limiter. Per server instance only: swap for a shared store
// (e.g. Upstash Redis or a Supabase table) when running multiple instances in production.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSec };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (!b.hits.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSec: 0 };
}

export function clientKey(req: Request, scope: string) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

export function tooMany(r: RateLimitResult) {
  return Response.json(
    { error: "You're going a little fast. Take a breath and try again in a moment." },
    { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } },
  );
}
