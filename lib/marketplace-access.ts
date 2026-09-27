/**
 * Per-account scoping for the marketplace_admin role.
 *
 * marketplace.listings.manage (lib/roles.ts) answers "can this role touch
 * listings at all" - it says nothing about *which* of the three categories.
 * A marketplace_admin account is created with an explicit whitelist
 * (user.marketplaceAccess) naming the categories it may see and write to;
 * admin/superadmin keep unrestricted access since they already held it
 * before this field existed.
 */

import { can } from "@/lib/roles"
import type { ListingKind } from "@/lib/validations/listing-request"

export const MARKETPLACE_CATEGORIES = ["sales", "drugs", "feeds"] as const

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number]

export function isMarketplaceCategory(value: unknown): value is MarketplaceCategory {
  return typeof value === "string" && (MARKETPLACE_CATEGORIES as readonly string[]).includes(value)
}

/**
 * Coerce untrusted input (form data, request bodies, legacy documents) into a
 * deduplicated list of valid categories. Unknown values are dropped, so a
 * malformed payload can only ever narrow access, never widen it.
 */
export function normalizeMarketplaceAccess(raw: unknown): MarketplaceCategory[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw]
  return MARKETPLACE_CATEGORIES.filter((category) => values.includes(category))
}

interface MarketplaceAccessUser {
  role?: string
  marketplaceAccess?: unknown
}

/**
 * Categories `user` may view and manage in the marketplace admin portal.
 * admin/superadmin are unrestricted; marketplace_admin is scoped to its
 * grant; every other role gets none.
 */
export function allowedMarketplaceCategories(
  user: MarketplaceAccessUser | null | undefined
): MarketplaceCategory[] {
  if (!user) return []
  if (user.role === "admin" || user.role === "superadmin") return [...MARKETPLACE_CATEGORIES]
  if (user.role === "marketplace_admin") return normalizeMarketplaceAccess(user.marketplaceAccess)
  return []
}

export function canAccessMarketplaceCategory(
  user: MarketplaceAccessUser | null | undefined,
  category: unknown
): boolean {
  return isMarketplaceCategory(category) && allowedMarketplaceCategories(user).includes(category)
}

/**
 * Which kind of listing `role` submits as a seller: farmers sell animals, pharmacies
 * sell drugs. Null for everyone else. Decided from the role, never from the request
 * body, so a farmer cannot post into the pharmacy and vice versa.
 */
export function sellerListingKind(role: unknown): ListingKind | null {
  if (can(role, "marketplace.listings.request")) return "animal"
  if (can(role, "marketplace.drugs.request")) return "drug"
  return null
}
