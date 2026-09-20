import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { resolveLocation } from "@/lib/rwanda-geo"
import type {
  ListingChange,
  ListingRequestInput,
  ListingRequestStatus,
  RemovalStatus,
} from "@/lib/validations/listing-request"
import { sellerEditableFilter, setListingHidden, type ListingVisibility } from "@/lib/db-listings"
import { notifyFarmer, notifySuperadmin } from "@/lib/marketplace-notifications"

const DB_NAME = "ntdm_animal_hospital"

/**
 * A farmer's request to have an animal listed for sale.
 *
 * Nothing here writes to animal_transactions - that collection is the farmer's own
 * herd bookkeeping and has nothing to do with the marketplace, despite the similar
 * name on their sidebar.
 */
export interface ListingRequest {
  _id: ObjectId
  farmerId: string
  farmerName: string
  /** Copied from the farmer's account at submission, so approve doesn't have to re-read the user. */
  sellerPhone: string
  sellerEmail: string
  animalId: string | null
  title: string
  animalType: string
  breed: string | null
  age: string | null
  sex: string | null
  proposedPrice: number
  description: string
  district: string
  sector: string | null
  village: string | null
  latitude: number | null
  longitude: number | null
  photos: string[]
  status: ListingRequestStatus
  reviewedBy: ObjectId | null
  reviewedAt: Date | null
  reviewNote: string | null
  /**
   * Every rejection this request has been through, oldest first. Resubmitting clears
   * `reviewNote` (the request is pending again), so the reasons live on here for the
   * reviewer to check the farmer actually addressed them. Absent on older documents.
   */
  reviewHistory?: ReviewHistoryEntry[]
  resubmitCount?: number
  publishedServiceId: string | null
  /** The farmer's request to have the published listing taken down. Absent until they ask. */
  removal?: RemovalRequest | null
  /**
   * The farmer editing a listing that is already published. Edits go live at once, so
   * this is how the marketplace finds out: it is mirrored onto the service document,
   * where the listings screen reads it. `editLog` keeps the last few edits.
   */
  editCount?: number
  editedAt?: Date | null
  editLog?: { at: Date; changes: ListingChange[] }[]
  /** Set when the farmer deletes the request from their list. The document stays for the audit trail. */
  farmerDeletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

/** Edits kept per listing; older ones fall off so the document cannot grow without bound. */
const EDIT_LOG_LIMIT = 10

export interface RemovalRequest {
  status: RemovalStatus
  reason: string | null
  requestedAt: Date
  reviewedBy: ObjectId | null
  reviewedAt: Date | null
  reviewNote: string | null
}

export interface ReviewHistoryEntry {
  note: string
  reviewedAt: Date | null
  reviewedBy: ObjectId | null
}

export class ListingRequestError extends Error {}

async function getDb() {
  const client = await clientPromise
  return client.db(DB_NAME)
}

async function getCollection() {
  const db = await getDb()
  return db.collection<ListingRequest>("listing_requests")
}

function emptyToNull(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim()
  return trimmed.length > 0 ? trimmed : null
}

type SellerFields = Pick<
  ListingRequest,
  | "title" | "description" | "proposedPrice" | "photos" | "animalType" | "breed" | "age" | "sex"
  | "district" | "sector" | "village" | "latitude" | "longitude" | "sellerPhone" | "sellerEmail"
>

/**
 * The fields of a service document that come from the farmer's request. Approving
 * writes them once and a later edit writes them again, so both go through here and
 * the storefront copy cannot drift from what the farmer entered.
 */
function publishedFields(source: SellerFields) {
  const fallback = resolveLocation(source.district, source.sector)
  return {
    name: source.title,
    description: source.description,
    price: source.proposedPrice,
    image: source.photos[0] ?? null,
    images: source.photos,
    animalType: source.animalType,
    breed: source.breed ?? "",
    age: source.age ?? "",
    sex: source.sex ?? "",
    district: source.district,
    sector: source.sector ?? "",
    village: source.village ?? "",
    // Prefer the farmer's own GPS pin; fall back to sector/district center so
    // every published listing is location-searchable.
    latitude: source.latitude ?? fallback?.lat ?? null,
    longitude: source.longitude ?? fallback?.lng ?? null,
    // Seller contact rides along but is stripped from public API responses -
    // see canViewSellerContact in lib/roles.ts. It is what the connection fee buys.
    sellerPhone: source.sellerPhone,
    sellerEmail: source.sellerEmail,
  }
}

/** The request-side columns for a submitted form, shared by create, resubmit and edit. */
function requestFieldsFromInput(
  farmer: { name: string; phone?: string; email: string },
  input: ListingRequestInput
) {
  return {
    farmerName: farmer.name,
    sellerPhone: (farmer.phone ?? "").trim(),
    sellerEmail: farmer.email,
    animalId: emptyToNull(input.animalId),
    title: input.title.trim(),
    animalType: input.animalType,
    breed: emptyToNull(input.breed),
    age: emptyToNull(input.age),
    sex: input.sex ?? null,
    proposedPrice: input.proposedPrice,
    description: input.description.trim(),
    district: input.district.trim(),
    sector: emptyToNull(input.sector),
    village: emptyToNull(input.village),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    photos: input.photos,
  }
}

const clip = (value: string) => (value.length > 300 ? `${value.slice(0, 297)}...` : value)

/** What the seller changed, field by field - the marketplace's view of an edit. */
function diffListing(before: ListingRequest, after: ReturnType<typeof requestFieldsFromInput>): ListingChange[] {
  const changes: ListingChange[] = []
  // Compared in full and only clipped for storage, so a long description edited near
  // its end still registers as changed.
  const compare = (field: ListingChange["field"], from: string | number | null, to: string | number | null) => {
    const a = String(from ?? "")
    const b = String(to ?? "")
    if (a !== b) changes.push({ field, from: clip(a), to: clip(b) })
  }
  const pin = (lat: number | null, lng: number | null) => (lat != null && lng != null ? `${lat}, ${lng}` : "")

  compare("title", before.title, after.title)
  compare("animalType", before.animalType, after.animalType)
  compare("breed", before.breed, after.breed)
  compare("age", before.age, after.age)
  compare("sex", before.sex, after.sex)
  compare("price", before.proposedPrice, after.proposedPrice)
  compare("description", before.description, after.description)
  compare("district", before.district, after.district)
  compare("sector", before.sector, after.sector)
  compare("village", before.village, after.village)
  compare("gps", pin(before.latitude, before.longitude), pin(after.latitude, after.longitude))
  // Photos compare by content and order (the first is the cover) but read out as counts.
  if (before.photos.join("|") !== after.photos.join("|")) {
    changes.push({ field: "photos", from: String(before.photos.length), to: String(after.photos.length) })
  }
  return changes
}

export async function createListingRequest(
  farmer: { _id: string; name: string; phone?: string; email: string },
  input: ListingRequestInput
): Promise<ListingRequest> {
  const collection = await getCollection()

  const now = new Date()
  const doc: Omit<ListingRequest, "_id"> = {
    farmerId: farmer._id,
    ...requestFieldsFromInput(farmer, input),
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    publishedServiceId: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc as ListingRequest)

  await notifySuperadmin(
    "New listing request",
    `${farmer.name} submitted "${doc.title}" for review.`,
    "/marketplace/requests"
  )

  return { ...doc, _id: result.insertedId } as ListingRequest
}

// `farmerDeletedAt: null` matches a missing field too, so older documents still list.
export async function listRequestsForFarmer(farmerId: string): Promise<ListingRequest[]> {
  const collection = await getCollection()
  return collection.find({ farmerId, farmerDeletedAt: null } as any).sort({ createdAt: -1 }).toArray()
}

export async function listRequests(status?: ListingRequestStatus): Promise<ListingRequest[]> {
  const collection = await getCollection()
  // A request the farmer deleted is off the queue for the marketplace too: only
  // rejected, withdrawn or taken-down ones can be deleted, so nothing there needs action.
  const filter: Record<string, unknown> = { farmerDeletedAt: null, ...(status ? { status } : {}) }
  // Oldest first while pending, so the queue is genuinely first-come-first-served.
  // updatedAt is the time a request entered the queue: nothing touches a pending
  // request except submitting or resubmitting it, so a resubmission rejoins at the
  // back rather than jumping ahead on its original createdAt.
  const sort: Record<string, 1 | -1> = status === "pending" ? { updatedAt: 1 } : { updatedAt: -1 }
  return collection.find(filter as any).sort(sort).toArray()
}

export async function countPendingRequests(): Promise<number> {
  const collection = await getCollection()
  return collection.countDocuments({ status: "pending" })
}

export async function getRequestById(id: string): Promise<ListingRequest | null> {
  if (!ObjectId.isValid(id)) return null
  const collection = await getCollection()
  return collection.findOne({ _id: new ObjectId(id) })
}

/**
 * Publish a pending request to the storefront.
 *
 * The `status: "pending"` filter is what makes this happen once - two reviewers
 * opening the same queue can't both publish the animal.
 */
export async function approveRequest(
  id: string,
  reviewer: { _id: string },
  categoryId: string,
  note?: string
): Promise<{ serviceId: string }> {
  const collection = await getCollection()
  const db = await getDb()

  const request = await getRequestById(id)
  if (!request) throw new ListingRequestError("Request not found")
  if (request.status !== "pending") throw new ListingRequestError("This request has already been reviewed")

  // Claim the request before creating the listing, so a lost race can't leave a
  // published listing behind with no approved request pointing at it.
  const claim = await collection.updateOne(
    { _id: new ObjectId(id), status: "pending" },
    {
      $set: {
        status: "approved",
        reviewedBy: new ObjectId(reviewer._id),
        reviewedAt: new Date(),
        reviewNote: emptyToNull(note),
        updatedAt: new Date(),
      },
    }
  )
  if (claim.matchedCount === 0) {
    throw new ListingRequestError("This request has already been reviewed")
  }

  const service = {
    ...publishedFields(request),
    duration: "",
    category: "sales",
    categoryId,
    sellerId: request.farmerId,
    requestId: id,
    listingStatus: "active",
    createdAt: new Date(),
  }

  let serviceId: string
  try {
    const inserted = await db.collection("services").insertOne(service)
    serviceId = inserted.insertedId.toString()
  } catch (error) {
    // Put the request back in the queue rather than stranding it as approved with
    // nothing published.
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "pending", reviewedBy: null, reviewedAt: null, updatedAt: new Date() } }
    )
    throw error
  }

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { publishedServiceId: serviceId, updatedAt: new Date() } }
  )

  await notifyFarmer(
    request.farmerId,
    "Your animal is now listed",
    `"${request.title}" is live on the marketplace. Buyers who want it will be put in touch with you through Vettrack.`,
    "/farmer/listings"
  )

  return { serviceId }
}

export async function rejectRequest(
  id: string,
  reviewer: { _id: string },
  note: string
): Promise<void> {
  const collection = await getCollection()

  const request = await getRequestById(id)
  if (!request) throw new ListingRequestError("Request not found")

  const result = await collection.updateOne(
    { _id: new ObjectId(id), status: "pending" },
    {
      $set: {
        status: "rejected",
        reviewedBy: new ObjectId(reviewer._id),
        reviewedAt: new Date(),
        reviewNote: note.trim(),
        updatedAt: new Date(),
      },
    }
  )
  if (result.matchedCount === 0) {
    throw new ListingRequestError("This request has already been reviewed")
  }

  await notifyFarmer(
    request.farmerId,
    "Your listing request was not approved",
    `"${request.title}" was not published. ${note.trim()} You can update it and send it again.`,
    "/farmer/listings"
  )
}

/**
 * A farmer revising a rejected request and sending it back for another review.
 *
 * The same document goes back to "pending" rather than a new one being created, so
 * the farmer's list stays one row per animal and the reviewer can see the history.
 * The `status: "rejected"` + `farmerId` filter is the guard: only the owner can do
 * it, only from a rejected state, and a double-click can't queue it twice.
 */
export async function resubmitRequest(
  id: string,
  farmer: { _id: string; name: string; phone?: string; email: string },
  input: ListingRequestInput
): Promise<ListingRequest> {
  const collection = await getCollection()

  const request = await getRequestById(id)
  if (!request || request.farmerId !== farmer._id || request.farmerDeletedAt) {
    throw new ListingRequestError("Request not found")
  }
  if (request.status !== "rejected") {
    throw new ListingRequestError("Only a request that was not approved can be resubmitted")
  }

  const now = new Date()
  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), farmerId: farmer._id, status: "rejected", farmerDeletedAt: null } as any,
    {
      $set: {
        // Refreshed from the account, so a phone number fixed since the first attempt
        // is the one that reaches buyers.
        ...requestFieldsFromInput(farmer, input),
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        updatedAt: now,
      },
      $inc: { resubmitCount: 1 },
      $push: {
        reviewHistory: {
          note: request.reviewNote ?? "",
          reviewedAt: request.reviewedAt,
          reviewedBy: request.reviewedBy,
        },
      },
    },
    { returnDocument: "after" }
  )
  if (!updated) {
    throw new ListingRequestError("This request can no longer be resubmitted")
  }

  await notifySuperadmin(
    "Listing request resubmitted",
    `${farmer.name} revised "${updated.title}" and sent it back for review.`,
    "/marketplace/requests"
  )

  return updated
}

/** A farmer pulling their own request back - only possible while it is still pending. */
export async function withdrawRequest(id: string, farmerId: string): Promise<void> {
  const collection = await getCollection()
  const result = await collection.updateOne(
    { _id: new ObjectId(id), farmerId, status: "pending" },
    { $set: { status: "withdrawn", updatedAt: new Date() } }
  )
  if (result.matchedCount === 0) {
    throw new ListingRequestError("This request can no longer be withdrawn")
  }
}

/**
 * A farmer asking for their published listing to come down (sold, no longer needed).
 *
 * The seller never hides a listing themselves - this only queues the ask, and staff
 * decide. The `removal.status !== "pending"` filter keeps it to one open ask at a time,
 * so a double-click can't queue it twice; a declined ask can be made again.
 */
export async function requestRemoval(
  id: string,
  farmer: { _id: string; name: string },
  reason?: string
): Promise<ListingRequest> {
  const collection = await getCollection()
  const db = await getDb()

  const request = await getRequestById(id)
  if (!request || request.farmerId !== farmer._id || request.farmerDeletedAt) {
    throw new ListingRequestError("Request not found")
  }
  if (request.status !== "approved" || !request.publishedServiceId || !ObjectId.isValid(request.publishedServiceId)) {
    throw new ListingRequestError("Only a published listing can be removed")
  }

  // A listing staff have hidden can still be asked to come down: hidden is a marketplace
  // decision, and without this the seller would have no way to get rid of it.
  const listing = await db
    .collection("services")
    .findOne({ _id: new ObjectId(request.publishedServiceId) }, { projection: { _id: 1 } })
  if (!listing) throw new ListingRequestError("This listing is no longer on the marketplace")

  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), farmerId: farmer._id, status: "approved", "removal.status": { $ne: "pending" } } as any,
    {
      $set: {
        removal: {
          status: "pending",
          reason: emptyToNull(reason),
          requestedAt: new Date(),
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
        },
      },
    },
    { returnDocument: "after" }
  )
  if (!updated) throw new ListingRequestError("A removal request is already waiting for review")

  await notifySuperadmin(
    "Listing removal requested",
    `${farmer.name} asked to remove "${updated.title}" from the marketplace.`,
    "/marketplace/requests"
  )

  return updated
}

/** Removal asks waiting for a decision, oldest first. */
export async function listRemovalRequests(): Promise<ListingRequest[]> {
  const collection = await getCollection()
  return collection
    .find({ "removal.status": "pending" } as any)
    .sort({ "removal.requestedAt": 1 })
    .toArray()
}

/**
 * Staff answering a removal request.
 *
 * Approving hides the listing from the public pages rather than deleting it: the
 * approved request, any orders and the listing itself stay intact, and staff can still
 * delete it outright from the listings screen if that is what they want.
 */
export async function decideRemoval(
  id: string,
  reviewer: { _id: string },
  decision: "approve" | "decline",
  note?: string
): Promise<void> {
  const collection = await getCollection()
  const db = await getDb()

  const request = await getRequestById(id)
  if (!request) throw new ListingRequestError("Request not found")
  if (request.removal?.status !== "pending") {
    throw new ListingRequestError("There is no removal request waiting on this listing")
  }

  // Claim the decision first, so two reviewers can't both act on the same ask.
  const claim = await collection.updateOne(
    { _id: new ObjectId(id), "removal.status": "pending" } as any,
    {
      $set: {
        "removal.status": decision === "approve" ? "approved" : "declined",
        "removal.reviewedBy": new ObjectId(reviewer._id),
        "removal.reviewedAt": new Date(),
        "removal.reviewNote": emptyToNull(note),
      },
    }
  )
  if (claim.matchedCount === 0) {
    throw new ListingRequestError("This removal request has already been decided")
  }

  if (decision === "approve" && request.publishedServiceId && ObjectId.isValid(request.publishedServiceId)) {
    const listing = await db
      .collection("services")
      .findOne({ _id: new ObjectId(request.publishedServiceId) }, { projection: { name: 1, sellerId: 1 } })
    // A listing staff already deleted has nothing left to hide; the ask is still resolved.
    if (listing) {
      try {
        await setListingHidden(
          { _id: listing._id, name: listing.name, sellerId: listing.sellerId },
          true,
          "Removed at the seller's request",
          { notify: false }
        )
      } catch (error) {
        // Put the ask back in the queue rather than record it approved with the
        // listing still live.
        await collection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              "removal.status": "pending",
              "removal.reviewedBy": null,
              "removal.reviewedAt": null,
              "removal.reviewNote": null,
            },
          }
        )
        throw error
      }
    }
  }

  await notifyFarmer(
    request.farmerId,
    decision === "approve" ? "Your listing was removed" : "Your removal request was declined",
    decision === "approve"
      ? `"${request.title}" was taken off the marketplace, as you asked.`
      : `"${request.title}" stays on the marketplace. ${note?.trim() ?? ""}`.trim(),
    "/farmer/listings"
  )
}

/**
 * A published animal that is no longer on the marketplace: staff approved the seller's
 * removal request (and have not restored it since), or deleted the listing outright.
 * `listing` is null when the service document is gone.
 */
export function isListingRemoved(request: ListingRequest, listing: ListingVisibility | null): boolean {
  if (request.status !== "approved" || !request.publishedServiceId) return false
  if (!listing) return true
  return request.removal?.status === "approved" && listing.hidden
}

/** A seller may edit a live listing unless it was taken down or is tied up in a deal. */
export function canFarmerEdit(request: ListingRequest, listing: ListingVisibility | null): boolean {
  return (
    request.status === "approved" &&
    !!request.publishedServiceId &&
    !!listing &&
    !listing.locked &&
    !isListingRemoved(request, listing)
  )
}

/** Only what is off the marketplace can go from the seller's list: never a live or pending post. */
export function canFarmerDelete(request: ListingRequest, listing: ListingVisibility | null): boolean {
  if (request.status === "rejected" || request.status === "withdrawn") return true
  return isListingRemoved(request, listing)
}

/**
 * The seller deleting a post from their list: a rejected or withdrawn request, or a
 * published one that has been taken down.
 *
 * This is a soft delete - the request drops out of the seller's list and the
 * marketplace queue, but the document stays, because a taken-down listing may still have
 * orders that point at it. Staff can remove the listing itself from the listings screen.
 */
export async function deleteRequestForFarmer(id: string, farmerId: string): Promise<void> {
  const collection = await getCollection()
  const db = await getDb()

  const request = await getRequestById(id)
  if (!request || request.farmerId !== farmerId || request.farmerDeletedAt) {
    throw new ListingRequestError("Request not found")
  }

  let listing: ListingVisibility | null = null
  if (request.status === "approved" && request.publishedServiceId && ObjectId.isValid(request.publishedServiceId)) {
    const doc = await db
      .collection("services")
      .findOne({ _id: new ObjectId(request.publishedServiceId) }, { projection: { hidden: 1 } })
    listing = doc ? { hidden: doc.hidden === true, reason: null, locked: false } : null
  }
  if (!canFarmerDelete(request, listing)) {
    throw new ListingRequestError("Only a post that is unpublished or has been removed can be deleted")
  }

  // Pinned to the status it was checked in: a request resubmitted in the meantime is
  // pending again and must not be swept away by a stale click.
  const result = await collection.updateOne(
    { _id: new ObjectId(id), farmerId, status: request.status, farmerDeletedAt: null } as any,
    { $set: { farmerDeletedAt: new Date() } }
  )
  if (result.matchedCount === 0) {
    throw new ListingRequestError("This post can no longer be deleted")
  }
}

/**
 * A seller changing a listing that is already published.
 *
 * Edits go live at once rather than back through review - the farmer is fixing a price
 * or adding a photo, and a re-review would take the animal off sale meanwhile. The
 * marketplace is told instead: the change is logged on the request and on the service
 * document (which the listings screen reads) and staff are notified.
 *
 * The service is updated first, under sellerEditableFilter, so an animal that a buyer
 * has just claimed cannot have its details changed under them.
 */
export async function editPublishedListing(
  id: string,
  farmer: { _id: string; name: string; phone?: string; email: string },
  input: ListingRequestInput
): Promise<{ request: ListingRequest; changes: ListingChange[] }> {
  const collection = await getCollection()
  const db = await getDb()
  const services = db.collection("services")

  const request = await getRequestById(id)
  if (!request || request.farmerId !== farmer._id || request.farmerDeletedAt) {
    throw new ListingRequestError("Request not found")
  }
  if (request.status !== "approved" || !request.publishedServiceId || !ObjectId.isValid(request.publishedServiceId)) {
    throw new ListingRequestError("Only a published listing can be edited")
  }
  if (request.removal?.status === "approved") {
    throw new ListingRequestError("This listing was removed and can no longer be edited")
  }

  const next = requestFieldsFromInput(farmer, input)
  const changes = diffListing(request, next)
  if (changes.length === 0) {
    throw new ListingRequestError("Nothing was changed")
  }

  const now = new Date()
  const serviceId = new ObjectId(request.publishedServiceId)
  const entry = { at: now, changes }
  const logPush = { editLog: { $each: [entry], $slice: -EDIT_LOG_LIMIT } }

  const published = await services.updateOne(
    { _id: serviceId, sellerId: farmer._id, ...sellerEditableFilter(now) } as any,
    {
      $set: { ...publishedFields(next), editedAt: now, updatedAt: now },
      $inc: { editCount: 1 },
      $push: logPush,
    } as any
  )
  if (published.matchedCount === 0) {
    const current = await services.findOne({ _id: serviceId }, { projection: { listingStatus: 1 } })
    if (!current) throw new ListingRequestError("This listing is no longer on the marketplace")
    throw new ListingRequestError(
      current.listingStatus === "sold" || current.listingStatus === "withdrawn"
        ? "This animal has been sold or withdrawn, so it can't be edited"
        : "A buyer is arranging this animal right now, so it can't be edited until that finishes"
    )
  }

  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), farmerId: farmer._id, status: "approved" } as any,
    {
      $set: { ...next, editedAt: now, updatedAt: now },
      $inc: { editCount: 1 },
      $push: logPush,
    } as any,
    { returnDocument: "after" }
  )
  if (!updated) throw new ListingRequestError("This listing can no longer be edited")

  await notifySuperadmin(
    "Listing edited by the seller",
    `${farmer.name} edited "${updated.title}". Changed: ${changes.map((c) => c.field).join(", ")}.`,
    "/marketplace/listings"
  )

  return { request: updated, changes }
}

/** Wire shape - ObjectIds stringified, nothing sensitive added. */
export function serializeRequest(request: ListingRequest, listing?: ListingVisibility | null) {
  // `undefined` means the caller did not look the listing up (single-request reads), so
  // nothing that depends on its live state can be claimed. `null` means it was looked up
  // and staff have deleted it.
  const looked = listing !== undefined
  return {
    /** Live state of the published listing; null while unpublished or if staff deleted it. */
    listing: listing ?? null,
    /** Derived here so the farmer's page and the API guards agree on what is allowed. */
    removed: looked && isListingRemoved(request, listing ?? null),
    editable: looked && canFarmerEdit(request, listing ?? null),
    deletable: looked && canFarmerDelete(request, listing ?? null),
    editCount: request.editCount ?? 0,
    editedAt: request.editedAt ?? null,
    id: request._id.toString(),
    farmerId: request.farmerId,
    farmerName: request.farmerName,
    animalId: request.animalId,
    title: request.title,
    animalType: request.animalType,
    breed: request.breed,
    age: request.age,
    sex: request.sex,
    proposedPrice: request.proposedPrice,
    description: request.description,
    district: request.district,
    sector: request.sector,
    village: request.village,
    latitude: request.latitude ?? null,
    longitude: request.longitude ?? null,
    photos: request.photos,
    status: request.status,
    reviewNote: request.reviewNote,
    resubmitCount: request.resubmitCount ?? 0,
    reviewHistory: (request.reviewHistory ?? []).map((entry) => ({
      note: entry.note,
      reviewedAt: entry.reviewedAt,
    })),
    publishedServiceId: request.publishedServiceId,
    removal: request.removal
      ? {
          status: request.removal.status,
          reason: request.removal.reason,
          requestedAt: request.removal.requestedAt,
          reviewedAt: request.removal.reviewedAt,
          reviewNote: request.removal.reviewNote,
        }
      : null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}
