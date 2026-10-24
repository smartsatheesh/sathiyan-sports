// Best-effort fixed-window rate limiter kept in memory. On Vercel each warm instance has
// its own counters, so this slows down brute force and abuse at zero cost rather than
// giving exact global limits.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateLimitRule {
  pattern: RegExp;
  limit: number;
  windowMs: number;
  methods?: string[];
}

const MIN = 60_000;

export const RATE_LIMITS: RateLimitRule[] = [
  { pattern: /^\/api\/auth\/callback\/credentials$/, limit: 10, windowMs: 15 * MIN },
  { pattern: /^\/api\/auth\/(forgot-password|forgot-password-otp|verify-otp|reset-password|reset-password-otp)$/, limit: 5, windowMs: 15 * MIN, methods: ["POST"] },
  { pattern: /^\/api\/register$/, limit: 5, windowMs: 60 * MIN, methods: ["POST"] },
  { pattern: /^\/api\/(contact|tournaments\/public-register)$/, limit: 5, windowMs: 15 * MIN, methods: ["POST"] },
  { pattern: /^\/api\/chatbot$/, limit: 20, windowMs: 10 * MIN, methods: ["POST"] },
  { pattern: /^\/api\/(coach\/generate-plan|fitness-plans\/generate)$/, limit: 5, windowMs: 60 * MIN, methods: ["POST"] },
  { pattern: /^\/api\/(payment|bookings)(\/|$)/, limit: 30, windowMs: 10 * MIN, methods: ["POST", "PATCH"] },
  { pattern: /^\/api\/attendance\/(check-mobile|scan)$/, limit: 30, windowMs: 10 * MIN },
];

export function checkRateLimit(
  pathname: string,
  method: string,
  clientKey: string
): { limited: boolean; retryAfterSec: number } {
  const rule = RATE_LIMITS.find(
    (r) => r.pattern.test(pathname) && (!r.methods || r.methods.includes(method))
  );
  if (!rule) return { limited: false, retryAfterSec: 0 };

  const now = Date.now();
  const key = `${rule.pattern.source}|${clientKey}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > rule.limit) {
    return { limited: true, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { limited: false, retryAfterSec: 0 };
}
