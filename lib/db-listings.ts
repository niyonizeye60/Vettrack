import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { notifyFarmer } from "@/lib/marketplace-notifications"

const DB_NAME = "ntdm_animal_hospital"

/**
 * Whether a published listing is visible to the public. Only marketplace staff change
 * it; the seller can see it on their own page and can ask for the listing to be
 * removed (see requestRemoval in db-listing-requests.ts) but never flips it.
 *
 * Hiding is its own `hidden` flag rather than a `listingStatus` value on purpose:
 * the reservation code (claim/release/paid in lib/db-orders.ts) owns listingStatus
 * and rewrites it whenever a buyer's hold changes, so a hidden state stored there
 * would be silently undone the next time a hold lapsed.
 */
export interface ListingVisibility {
  hidden: boolean
  /** Staff's stated reason, shown to the seller. */
  reason: string | null
  /**
   * A buyer is arranging this animal, or it has been sold or withdrawn. The seller
   * cannot edit the listing while this is true - see sellerEditableFilter.
   */
  locked: boolean
}

export class ListingVisibilityError extends Error {}

async function getServices() {
  const client = await clientPromise
  return client.db(DB_NAME).collection("services")
}

/**
 * Whether the animal is tied up in a deal: sold, withdrawn, or held by a buyer whose
 * hold has not lapsed. Mirrors the availability rule in lib/db-orders.ts.
 */
export function isListingLocked(
  doc: { listingStatus?: string | null; reservedUntil?: Date | string | null },
  now: Date = new Date()
): boolean {
  if (doc.listingStatus === "sold" || doc.listingStatus === "withdrawn") return true
  if (doc.listingStatus !== "reserved") return false
  const until = doc.reservedUntil ? new Date(doc.reservedUntil) : null
  return !until || until >= now
}

/**
 * The same rule as a query filter, so the check and the write are one atomic step: a
 * buyer claiming the animal between a seller opening the edit form and saving it
 * cannot be overwritten.
 */
export function sellerEditableFilter(now: Date = new Date()) {
  return {
    listingStatus: { $nin: ["sold", "withdrawn"] },
    $or: [{ listingStatus: { $ne: "reserved" } }, { reservedUntil: { $lt: now } }],
  }
}

/** Batch lookup for the farmer's request list; ids of deleted listings are simply absent. */
export async function getListingVisibility(serviceIds: string[]): Promise<Map<string, ListingVisibility>> {
  const valid = serviceIds.filter((id) => ObjectId.isValid(id))
  const result = new Map<string, ListingVisibility>()
  if (valid.length === 0) return result

  const services = await getServices()
  const docs = await services
    .find(
      { _id: { $in: valid.map((id) => new ObjectId(id)) } },
      { projection: { hidden: 1, hiddenReason: 1, listingStatus: 1, reservedUntil: 1 } }
    )
    .toArray()

  const now = new Date()
  for (const doc of docs) {
    result.set(doc._id.toString(), {
      hidden: doc.hidden === true,
      reason: doc.hidden === true ? doc.hiddenReason ?? null : null,
      locked: isListingLocked({ listingStatus: doc.listingStatus, reservedUntil: doc.reservedUntil }, now),
    })
  }
  return result
}

/**
 * Hide a published listing from, or restore it to, the public pages.
 *
 * `notify: false` is for callers that send the seller their own, more specific
 * message - e.g. approving a removal request, where "your listing was hidden" on top
 * of "your removal request was approved" would be two notifications for one event.
 */
export async function setListingHidden(
  listing: { _id: ObjectId; name?: string; sellerId?: string | null },
  hidden: boolean,
  reason?: string,
  options: { notify?: boolean } = {}
): Promise<void> {
  const services = await getServices()
  const now = new Date()

  const update = hidden
    ? { $set: { hidden: true, hiddenAt: now, hiddenReason: reason?.trim() || null, updatedAt: now } }
    : { $set: { hidden: false, updatedAt: now }, $unset: { hiddenAt: "", hiddenReason: "" } }

  const result = await services.updateOne({ _id: listing._id }, update as any)
  if (result.matchedCount === 0) {
    throw new ListingVisibilityError("Listing not found")
  }

  // A seller finding their animal gone from the marketplace should hear why.
  if (options.notify !== false && listing.sellerId && ObjectId.isValid(listing.sellerId)) {
    await notifyFarmer(
      listing.sellerId,
      hidden ? "Your listing was hidden" : "Your listing is visible again",
      hidden
        ? `"${listing.name ?? "Your animal"}" was hidden from the marketplace.${reason?.trim() ? ` ${reason.trim()}` : ""}`
        : `"${listing.name ?? "Your animal"}" is back on the marketplace.`,
      "/farmer/listings"
    )
  }
}
