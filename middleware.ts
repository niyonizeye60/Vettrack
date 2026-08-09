import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit, getRateLimitKey } from "./lib/rate-limit"

// Endpoints most valuable to brute-force or spam get the tight "sensitive"
// budget; everything else under /api gets the generous "standard" one.
const SENSITIVE_API_PATHS = new Set([
  "/api/forgot-password",
  "/api/reset-password",
  "/api/change-password",
  "/api/newsletter",
])

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api")) {
    const tier = SENSITIVE_API_PATHS.has(pathname) ? "sensitive" : "standard"
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")
    const key = getRateLimitKey(session, ip)
    const { success, retryAfterSeconds } = await checkRateLimit(key, tier)
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      )
    }
  }

  const protectedRoutes = [
    "/farmer",
    "/farmer/animals",
    "/farmer/consultations",
    "/farmer/messages",
    "/farmer/tracking",
    "/farmer/support",
    "/farmer/veterinarians",

    "/veterinary",
    "/veterinary/animals",
    "/veterinary/consultations",
    "/veterinary/messages",
    "/veterinary/tracking",
    "/veterinary/support",
    "/veterinary/farms",

    "/superadmin",

    "/admin",
  ]

  // If trying to access a protected route without a session, redirect to login
  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
