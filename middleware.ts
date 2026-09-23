import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit, getRateLimitKey } from "./lib/rate-limit"
import { isPortalPath } from "./lib/roles"

// Endpoints most valuable to brute-force or spam get the tight "sensitive"
// budget; everything else under /api gets the generous "standard" one.
const SENSITIVE_API_PATHS = new Set([
  "/api/forgot-password",
  "/api/reset-password",
  "/api/change-password",
  "/api/newsletter",
])

// Payment-gateway webhooks are machine-to-machine: the caller has no session
// and retries from a small set of gateway IPs, so per-IP budgets would rate-
// limit (or fully block) legitimate callbacks — e.g. a status-API outage makes
// the gateway retry every webhook, which then looks like a burst. They
// authenticate by correlating a server-generated transaction id instead, so
// skipping the limiter here doesn't open an abuse path.
const RATE_LIMIT_EXEMPT_PREFIXES = [
  "/api/payments/intouchpay/callback",
  "/api/payments/pesapal/ipn",
]

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api") && !RATE_LIMIT_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    const tier = SENSITIVE_API_PATHS.has(pathname) ? "sensitive" : "standard"
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")
    const key = getRateLimitKey(session, ip)
    try {
      const { success, retryAfterSeconds } = await checkRateLimit(key, tier)
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
        )
      }
    } catch (error) {
      // Limiter infrastructure failure (Redis down) must never take the whole
      // API with it — fail open; the endpoints' own auth still applies.
      console.error("Rate limit check failed, failing open:", error)
    }
  }

  // If trying to access a portal without a session, redirect to login. The prefix
  // list lives in lib/roles.ts so this and BodyWrapper cannot drift apart.
  if (isPortalPath(pathname) && !session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
