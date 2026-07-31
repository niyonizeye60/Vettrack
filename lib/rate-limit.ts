import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

if (!redis) {
  console.warn(
    "UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set - API rate limiting is disabled."
  )
}

// Login, registration, and password-reset/newsletter endpoints are the
// highest-value targets for brute-forcing and spam, so they get a much
// tighter budget than general API traffic.
const sensitiveLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "60 s"), prefix: "ratelimit:sensitive" })
  : null

const standardLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "60 s"), prefix: "ratelimit:standard" })
  : null

export type RateLimitTier = "sensitive" | "standard"

export async function checkRateLimit(key: string, tier: RateLimitTier) {
  const limiter = tier === "sensitive" ? sensitiveLimiter : standardLimiter
  if (!limiter) {
    // Not configured - fail open so the app keeps working without Redis.
    return { success: true, retryAfterSeconds: 0 }
  }
  const { success, reset } = await limiter.limit(key)
  return { success, retryAfterSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)) }
}

// Requests are keyed by session where available so users sharing a
// carrier-grade NAT IP aren't bucketed together; anonymous traffic (login,
// register, forgot-password) - where brute-forcing/spam actually happens -
// falls back to IP.
export function getRateLimitKey(sessionId: string | undefined | null, ip: string | null | undefined) {
  return sessionId ? `session:${sessionId}` : `ip:${ip || "unknown"}`
}
