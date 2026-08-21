/**
 * Single source of truth for role names and the access questions derived from them.
 *
 * Deliberately dependency-free so client components and route handlers can both
 * import it. Anything that needs the request itself - session lookup, DB reads -
 * stays with the caller, which keeps this module out of the client bundle's way.
 *
 * The marketplace_admin and finance_manager roles land in Phase 1. They are
 * absent here on purpose: STAFF_ROLES is what lib/farm-access.ts and ~55 other
 * call sites use to wave a request through to farm records, and neither new role
 * should inherit that.
 */

export const STAFF_ROLES = ["admin", "superadmin"] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export function isStaffRole(role: unknown): role is StaffRole {
  return typeof role === "string" && (STAFF_ROLES as readonly string[]).includes(role)
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
  return !!listing.sellerId && listing.sellerId === viewer._id
}
