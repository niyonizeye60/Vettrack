import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/db"
import { publicProductFilter } from "@/lib/stock"
import { getSellByDays } from "@/lib/db-settings"

const DB = "ntdm_animal_hospital"

/** The public storefront each marketplace category is sold on; a listing lives at `${path}/${id}`. */
export const STOREFRONT_PATHS = {
  sales: "/animal-sales",
  drugs: "/pharmacy",
  feeds: "/feeds",
} as const

export type StorefrontCategory = keyof typeof STOREFRONT_PATHS

/** Absolute site origin for robots.txt and the sitemap, which need full URLs. */
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")

/**
 * A listing the public may see, or null when there is none - no such id, or hidden,
 * sold out or past its sell-by date. The same rule /api/services applies, so a
 * listing is findable here exactly when its storefront page can show it.
 *
 * Throws when the database can't be reached, so callers can tell "gone" from
 * "couldn't check".
 */
export async function findPublicListing(category: StorefrontCategory, id: string) {
  if (!ObjectId.isValid(id)) return null
  const client = await clientPromise
  return client.db(DB).collection("services").findOne(
    { _id: new ObjectId(id), category, ...publicProductFilter(await getSellByDays()) },
    { projection: { name: 1 } }
  )
}

/** Every listing on the public storefronts, for the sitemap. Throws like findPublicListing. */
export async function listPublicListings() {
  const client = await clientPromise
  return client.db(DB).collection("services").find(
    { category: { $in: Object.keys(STOREFRONT_PATHS) }, ...publicProductFilter(await getSellByDays()) },
    { projection: { category: 1, createdAt: 1, updatedAt: 1 } }
  ).toArray()
}

/**
 * generateMetadata for a storefront detail page: the not-found page when the listing
 * is gone, and its name as the page title otherwise.
 *
 * The detail pages load their listing in the browser, so without this a missing
 * listing was served as an ordinary page that only said "not found" once its script
 * ran - indexable, under a generic title. Now the server renders Next's not-found
 * page, which carries noindex in its <head>.
 *
 * The status still reads 200, not 404: BodyWrapper wraps every page in <Suspense>,
 * so headers have gone out before notFound() is reached (this was tried - six
 * pages lean on that boundary for useSearchParams). noindex is what keeps these out
 * of search results.
 */
export async function storefrontListingMetadata(category: StorefrontCategory, id: string): Promise<Metadata> {
  let listing
  try {
    listing = await findPublicListing(category, id)
  } catch (error) {
    // Couldn't check. Serve the page as before and let it load the listing itself,
    // rather than tell search engines a real listing is gone.
    console.error("Failed to look up listing for metadata:", error)
    return {}
  }
  if (!listing) notFound()
  return typeof listing.name === "string" && listing.name ? { title: `${listing.name} - NTDM Vettrack` } : {}
}
