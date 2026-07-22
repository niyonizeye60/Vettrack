import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value
  const { pathname } = request.nextUrl

  const protectedRoutes = [
    "/farmer",
    "/farmer/animals",
    "/farmer/consultations",
    "/farmer/messages",
    "/farmer/tracking",
    "/farmer/support",

    "/veterinary",
    "/veterinary/animals",
    "/veterinary/consultations",
    "/veterinary/messages",
    "/veterinary/tracking",
    "/veterinary/support",

    "/superadmin",
    "/superadmin/users",
    "/superadmin/consultations",
    "/superadmin/dashboard",
    "/superadmin/settings",

    "/admin",
    "/admin/users",
    "/admin/consultations",
    "/admin/dashboard",
  ]

  // If trying to access a protected route without a session, redirect to login
  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
