/**
 * Single source of truth for role names and the access questions derived from them.
 *
 * Deliberately dependency-free so client components and route handlers can both
 * import it. Anything that needs the request itself - session lookup, DB reads -
 * stays with the caller.
 */

export const ROLES = [
  "farmer",
  "doctor",
  "admin",
  "superadmin",
  "marketplace_admin",
  "finance_manager",
] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

/**
 * Roles that may reach farm records (animals, disease, vaccination, insemination)
 * without a per-farm grant.
 *
 * marketplace_admin and finance_manager are absent on purpose. This is the set that
 * lib/farm-access.ts and ~55 other call sites use to wave a request straight
 * through, and neither new role has any business reading a farmer's medical
 * history. Their access is granted through CAPABILITIES below instead.
 */
export const STAFF_ROLES = ["admin", "superadmin"] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export function isStaffRole(role: unknown): role is StaffRole {
  return typeof role === "string" && (STAFF_ROLES as readonly string[]).includes(role)
}

/**
 * Roles nobody can self-register into - creating one requires an authenticated
 * superadmin. Enforced in lib/actions/auth.ts.
 */
export const PRIVILEGED_ROLES = ["admin", "superadmin", "marketplace_admin", "finance_manager"] as const

export function isPrivilegedRole(role: unknown): boolean {
  return typeof role === "string" && (PRIVILEGED_ROLES as readonly string[]).includes(role)
}

/**
 * What each role is allowed to do, as capabilities rather than role checks.
 *
 * `admin` keeps marketplace.listings.manage so today's behaviour is unchanged -
 * admins manage listings through content management right now. Whether that
 * transfers wholly to marketplace_admin is still an open decision; when it is made,
 * this map is the only place that changes.
 */
export const CAPABILITIES = {
  "marketplace.requests.review": ["marketplace_admin", "superadmin"],
  "marketplace.listings.manage": ["marketplace_admin", "admin", "superadmin"],
  "marketplace.listings.request": ["farmer"],
  "finance.view": ["finance_manager", "superadmin"],
  "finance.export": ["finance_manager", "superadmin"],
  "finance.commission.configure": ["finance_manager", "superadmin"],
} as const satisfies Record<string, readonly Role[]>

export type Capability = keyof typeof CAPABILITIES

export function can(role: unknown, capability: Capability): boolean {
  if (typeof role !== "string") return false
  return (CAPABILITIES[capability] as readonly string[]).includes(role)
}

/**
 * Where a role lands after login - and, via PORTAL_PATH_PREFIXES below, the only
 * place that says a path belongs to a signed-in portal.
 *
 * This used to be a switch statement with PORTAL_PATH_PREFIXES kept as a separate
 * hand-maintained array "in step with" it by comment only. They drifted: this map
 * grew a marketplace_admin and finance_manager entry, the array didn't, and both
 * new portals rendered with the public header/footer/chat widget on top of them.
 * Deriving the array from this map instead of restating it means a role can no
 * longer have a home page that isn't a protected, chrome-free portal - there is
 * nothing second to update.
 */
const ROLE_HOME_PATH: Record<Role, string> = {
  farmer: "/farmer",
  doctor: "/veterinary",
  admin: "/admin",
  superadmin: "/superadmin",
  marketplace_admin: "/marketplace",
  finance_manager: "/finance",
}

export function homePathForRole(role: unknown): string {
  return isRole(role) ? ROLE_HOME_PATH[role] : "/"
}

/**
 * Path prefixes that belong to a signed-in portal rather than the public site.
 * Read by the middleware (which requires a session for them) and by BodyWrapper
 * (which suppresses the public header, footer and chat widget).
 */
export const PORTAL_PATH_PREFIXES: readonly string[] = Array.from(new Set(Object.values(ROLE_HOME_PATH)))

/**
 * Matches the prefix exactly or as a path segment, so a future public route like
 * /financing or /administrators is not mistaken for a portal.
 */
export function isPortalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return PORTAL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

interface ContactViewer {
  _id?: string
  role?: string
}

interface SellerOwned {
  sellerId?: string
}

/**
 * Whether `viewer` may see a listing's sellerPhone / sellerEmail.
 *
 * Seller contact is the thing a buyer pays the connection fee for, so it must
 * never reach the public. app/api/services/route.ts strips both fields from every
 * response this returns false for - stripping server-side rather than hiding in
 * the UI, so the details aren't sitting in the JSON payload either.
 *
 * Phase 3 extends this with "...or holds a paid brokerage order for this listing".
 * Carrying the listing parameter now means that change lands here and nowhere else.
 */
export function canViewSellerContact(viewer: ContactViewer | null, listing: SellerOwned): boolean {
  if (!viewer) return false
  if (isStaffRole(viewer.role)) return true
  if (viewer.role === "marketplace_admin") return true
  return !!listing.sellerId && listing.sellerId === viewer._id
}
