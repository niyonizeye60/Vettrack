import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { resolveLocation } from "@/lib/rwanda-geo"
import {
  LISTING_KIND_CATEGORY,
  type ListingChange,
  type ListingKind,
  type ListingRequestStatus,
  type RemovalStatus,
  type SellerSubmission,
} from "@/lib/validations/listing-request"
import { sellerEditableFilter, setListingHidden, type ListingVisibility } from "@/lib/db-listings"
import { notifyFarmer, notifySuperadmin, sellerListingsPath } from "@/lib/marketplace-notifications"
import { setStock } from "@/lib/stock"
import { getSellByDays } from "@/lib/db-settings"
import { earliestAcceptableExpiry, MIN_DAYS_ON_SALE } from "@/lib/product-rules"

const DB_NAME = "ntdm_animal_hospital"

/**
 * A seller's request to have something listed: a farmer's animal, a pharmacy's drug
 * or a feed supplier's feed (`kind`). All kinds share this collection, the review
 * queue and every transition below; only the fields they carry differ.
 *
 * `farmerId` / `farmerName` predate pharmacies and hold whichever seller submitted
 * the request - renaming them would mean migrating every existing document.
 *
 * Nothing here writes to animal_transactions - that collection is the farmer's own
 * herd bookkeeping and has nothing to do with the marketplace, despite the similar
 * name on their sidebar.
 */
export interface ListingRequest {
  _id: ObjectId
  /** Absent on documents from before pharmacies existed, which are all animals. */
  kind?: ListingKind
  farmerId: string
  farmerName: string
  /** Copied from the farmer's account at submission, so approve doesn't have to re-read the user. */
  sellerPhone: string
  sellerEmail: string
  animalId: string | null
  title: string
  /** Animal fields: null on a drug request. */
  animalType: string | null
  breed: string | null
  age: string | null
  sex: string | null
  /** Drug fields: null or absent on an animal request. */
  drugType?: string | null
  usageDescription?: string | null
  /**
   * Units the seller had when it asked (drugs and feed). Copied onto the listing at
   * approval; from then on the live count is the listing's `stock`, which the
   * seller updates directly - see updateListingStock.
   */
  stock?: number | null
  /**
   * Expiry date on the pack, YYYY-MM-DD: required on a drug, optional on feed. Published
   * as the listing's `expiresOn`.
   */
  expiryDate?: string | null
  batchNumber?: string | null
  /** Rwanda FDA registration number. */
  registrationNumber?: string | null
  /** Sold only against a vet's prescription uploaded at checkout. */
  prescriptionRequired?: boolean
  /** Feed fields: null or absent on the other kinds. */
  feedType?: string | null
  quality?: string | null
  targetAnimal?: string | null
  /** What one unit is ("50 kg bag"). Published as the listing's `duration`, which the storefront shows beside the price. */
  unit?: string | null
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

export function listingKindOf(request: Pick<ListingRequest, "kind">): ListingKind {
  return request.kind ?? "animal"
}

/** Matches one kind; animals also match the older documents that carry no `kind`. */
function kindFilter(kind: ListingKind) {
  return kind === "animal" ? { kind: { $nin: ["drug", "feed"] } } : { kind }
}

/** For messages sellers read, so a pharmacy never hears about "this animal". */
function noun(kind: ListingKind) {
  return kind
}

/** The public page each kind goes live on, as sellers are told. */
const STOREFRONT_NAME: Record<ListingKind, string> = {
  animal: "the marketplace",
  drug: "the pharmacy page",
  feed: "the feeds page",
}

function emptyToNull(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim()
  return trimmed.length > 0 ? trimmed : null
}

type SellerFields = Pick<
  ListingRequest,
  | "title" | "description" | "proposedPrice" | "photos" | "animalType" | "breed" | "age" | "sex"
  | "drugType" | "usageDescription" | "expiryDate" | "batchNumber" | "registrationNumber" | "prescriptionRequired"
  | "feedType" | "quality" | "targetAnimal" | "unit"
  | "district" | "sector" | "village" | "latitude" | "longitude" | "sellerPhone" | "sellerEmail"
>

/**
 * The fields of a service document that come from the seller's request. Approving
 * writes them once and a later edit writes them again, so both go through here and
 * the storefront copy cannot drift from what the seller entered.
 *
 * Each kind writes the fields its storefront page reads: the animal sales page reads
 * animalType/breed/age/sex, the pharmacy page drugType/usageDescription, the feeds
 * page feedType/quality/targetAnimal - the same fields staff fill in when they list a
 * drug or feed themselves.
 */
function publishedFields(kind: ListingKind, source: SellerFields) {
  const fallback = resolveLocation(source.district, source.sector)
  const kindFields =
    kind === "drug"
      ? {
          drugType: source.drugType ?? "",
          usageDescription: source.usageDescription ?? "",
          // Read by the public filter: the drug comes off sale shortly before this date.
          expiresOn: source.expiryDate ?? null,
          batchNumber: source.batchNumber ?? "",
          registrationNumber: source.registrationNumber ?? "",
          prescriptionRequired: source.prescriptionRequired === true,
        }
      : kind === "feed"
        ? {
            feedType: source.feedType ?? "",
            quality: source.quality ?? "",
            targetAnimal: source.targetAnimal ?? "",
            // Shown beside the price on the feeds page ("RWF 25,000 / 50 kg bag").
            duration: source.unit ?? "",
            // Null when the feed has no date, which the public filter lets through.
            expiresOn: source.expiryDate ?? null,
            batchNumber: source.batchNumber ?? "",
          }
        : { animalType: source.animalType ?? "", breed: source.breed ?? "", age: source.age ?? "", sex: source.sex ?? "" }
  return {
    name: source.title,
    description: source.description,
    price: source.proposedPrice,
    image: source.photos[0] ?? null,
    images: source.photos,
    ...kindFields,
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
  submission: SellerSubmission
) {
  const input = submission.data
  // Every kind writes every column - the other kinds' as null - so a document's
  // shape doesn't depend on which form produced it.
  const none = {
    animalId: null,
    animalType: null,
    breed: null,
    age: null,
    sex: null,
    drugType: null,
    usageDescription: null,
    stock: null,
    expiryDate: null,
    batchNumber: null,
    registrationNumber: null,
    prescriptionRequired: false,
    feedType: null,
    quality: null,
    targetAnimal: null,
    unit: null,
  }
  const kindFields =
    submission.kind === "drug"
      ? {
          ...none,
          drugType: submission.data.drugType,
          usageDescription: emptyToNull(submission.data.usageDescription),
          stock: submission.data.stock,
          expiryDate: submission.data.expiryDate,
          batchNumber: emptyToNull(submission.data.batchNumber),
          registrationNumber: emptyToNull(submission.data.registrationNumber),
          prescriptionRequired: submission.data.prescriptionRequired,
        }
      : submission.kind === "feed"
        ? {
            ...none,
            feedType: submission.data.feedType,
            quality: emptyToNull(submission.data.quality),
            targetAnimal: emptyToNull(submission.data.targetAnimal),
            unit: submission.data.unit.trim(),
            stock: submission.data.stock,
            expiryDate: emptyToNull(submission.data.expiryDate),
            batchNumber: emptyToNull(submission.data.batchNumber),
          }
        : {
            ...none,
            animalId: emptyToNull(submission.data.animalId),
            animalType: submission.data.animalType,
            breed: emptyToNull(submission.data.breed),
            age: emptyToNull(submission.data.age),
            sex: submission.data.sex ?? null,
          }
  return {
    farmerName: farmer.name,
    sellerPhone: (farmer.phone ?? "").trim(),
    sellerEmail: farmer.email,
    title: input.title.trim(),
    ...kindFields,
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
function diffListing(
  kind: ListingKind,
  before: ListingRequest,
  after: ReturnType<typeof requestFieldsFromInput>
): ListingChange[] {
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
  compare("drugType", before.drugType ?? null, after.drugType)
  compare("usageDescription", before.usageDescription ?? null, after.usageDescription)
  compare("expiryDate", before.expiryDate ?? null, after.expiryDate)
  compare("batchNumber", before.batchNumber ?? null, after.batchNumber)
  compare("registrationNumber", before.registrationNumber ?? null, after.registrationNumber)
  if (kind === "drug") {
    const yesNo = (value: boolean | undefined) => (value ? "Yes" : "No")
    compare("prescriptionRequired", yesNo(before.prescriptionRequired), yesNo(after.prescriptionRequired))
  }
  compare("feedType", before.feedType ?? null, after.feedType)
  compare("quality", before.quality ?? null, after.quality)
  compare("targetAnimal", before.targetAnimal ?? null, after.targetAnimal)
  compare("unit", before.unit ?? null, after.unit)
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

/**
 * A drug - or feed that has an expiry date - must stay on sale for at least
 * MIN_DAYS_ON_SALE after it is listed, under the sell-by cutoff in force now. Checked
 * here rather than in the form schema because the cutoff is a superadmin setting.
 */
async function assertListableExpiry(submission: SellerSubmission): Promise<void> {
  if (submission.kind === "animal" || !submission.data.expiryDate) return
  const earliest = earliestAcceptableExpiry(await getSellByDays())
  if (submission.data.expiryDate < earliest) {
    throw new ListingRequestError(
      `This ${noun(submission.kind)} expires too soon to list: it must stay on sale for at least ${MIN_DAYS_ON_SALE} days. ` +
        `Choose an expiry date on or after ${earliest}.`
    )
  }
}

export async function createListingRequest(
  farmer: { _id: string; name: string; phone?: string; email: string },
  submission: SellerSubmission
): Promise<ListingRequest> {
  const collection = await getCollection()
  await assertListableExpiry(submission)

  const now = new Date()
  const doc: Omit<ListingRequest, "_id"> = {
    kind: submission.kind,
    farmerId: farmer._id,
    ...requestFieldsFromInput(farmer, submission),
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
    submission.kind === "animal" ? "New listing request" : `New ${noun(submission.kind)} listing request`,
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

export async function listRequests(kind: ListingKind, status?: ListingRequestStatus): Promise<ListingRequest[]> {
  const collection = await getCollection()
  // A request the seller deleted is off the queue for the marketplace too: only
  // rejected, withdrawn or taken-down ones can be deleted, so nothing there needs action.
  const filter: Record<string, unknown> = { farmerDeletedAt: null, ...kindFilter(kind), ...(status ? { status } : {}) }
  // Oldest first while pending, so the queue is genuinely first-come-first-served.
  // updatedAt is the time a request entered the queue: nothing touches a pending
  // request except submitting or resubmitting it, so a resubmission rejoins at the
  // back rather than jumping ahead on its original createdAt.
  const sort: Record<string, 1 | -1> = status === "pending" ? { updatedAt: 1 } : { updatedAt: -1 }
  return collection.find(filter as any).sort(sort).toArray()
}

export async function countPendingRequests(kind: ListingKind): Promise<number> {
  const collection = await getCollection()
  return collection.countDocuments({ status: "pending", ...kindFilter(kind) } as any)
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

  const kind = listingKindOf(request)
  const service = {
    // Before the seller's fields, so feed's unit (published as `duration`) wins.
    duration: "",
    ...publishedFields(kind, request),
    // Drugs and feed count their units from here on (lib/stock.ts). Not part of
    // publishedFields: an edit of the live listing must not reset the count.
    ...(kind !== "animal" && typeof request.stock === "number" ? { stock: request.stock, stockHolds: [] } : {}),
    category: LISTING_KIND_CATEGORY[kind],
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
    `Your ${noun(kind)} is now listed`,
    kind === "animal"
      ? `"${request.title}" is live on the marketplace. Buyers who want it will be put in touch with you through Vettrack.`
      : `"${request.title}" is live on ${STOREFRONT_NAME[kind]}.`,
    sellerListingsPath(LISTING_KIND_CATEGORY[kind])
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
    sellerListingsPath(LISTING_KIND_CATEGORY[listingKindOf(request)])
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
  submission: SellerSubmission
): Promise<ListingRequest> {
  const collection = await getCollection()

  const request = await getRequestById(id)
  if (!request || request.farmerId !== farmer._id || request.farmerDeletedAt) {
    throw new ListingRequestError("Request not found")
  }
  if (listingKindOf(request) !== submission.kind) {
    throw new ListingRequestError("Request not found")
  }
  if (request.status !== "rejected") {
    throw new ListingRequestError("Only a request that was not approved can be resubmitted")
  }
  await assertListableExpiry(submission)

  const now = new Date()
  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), farmerId: farmer._id, status: "rejected", farmerDeletedAt: null } as any,
    {
      $set: {
        // Refreshed from the account, so a phone number fixed since the first attempt
        // is the one that reaches buyers.
        ...requestFieldsFromInput(farmer, submission),
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
export async function listRemovalRequests(kind: ListingKind): Promise<ListingRequest[]> {
  const collection = await getCollection()
  return collection
    .find({ "removal.status": "pending", ...kindFilter(kind) } as any)
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
          {
            _id: listing._id,
            name: listing.name,
            sellerId: listing.sellerId,
            category: LISTING_KIND_CATEGORY[listingKindOf(request)],
          },
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
    sellerListingsPath(LISTING_KIND_CATEGORY[listingKindOf(request)])
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
    listing = doc ? { hidden: doc.hidden === true, reason: null, locked: false, stock: null, held: 0, lowStockAt: null } : null
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
  submission: SellerSubmission
): Promise<{ request: ListingRequest; changes: ListingChange[] }> {
  const collection = await getCollection()
  const db = await getDb()
  const services = db.collection("services")

  const request = await getRequestById(id)
  if (!request || request.farmerId !== farmer._id || request.farmerDeletedAt) {
    throw new ListingRequestError("Request not found")
  }
  if (listingKindOf(request) !== submission.kind) {
    throw new ListingRequestError("Request not found")
  }
  if (request.status !== "approved" || !request.publishedServiceId || !ObjectId.isValid(request.publishedServiceId)) {
    throw new ListingRequestError("Only a published listing can be edited")
  }
  if (request.removal?.status === "approved") {
    throw new ListingRequestError("This listing was removed and can no longer be edited")
  }

  const fields = requestFieldsFromInput(farmer, submission)
  const changes = diffListing(submission.kind, request, fields)
  // Only a new expiry date is held to the listing rule: an unrelated edit (a price)
  // must still work on a product whose date is getting close.
  if (changes.some((change) => change.field === "expiryDate")) await assertListableExpiry(submission)
  // The stock on the form is what was asked for at submission; the live count is
  // changed with updateListingStock, so an edit keeps the original on the request.
  const next = { ...fields, stock: request.stock ?? null }
  if (changes.length === 0) {
    throw new ListingRequestError("Nothing was changed")
  }

  const now = new Date()
  const serviceId = new ObjectId(request.publishedServiceId)
  const entry = { at: now, changes }
  const logPush = { editLog: { $each: [entry], $slice: -EDIT_LOG_LIMIT } }

  // A new expiry date re-arms the expiry warnings for the new date.
  const expiryChanged = changes.some((change) => change.field === "expiryDate")
  const published = await services.updateOne(
    { _id: serviceId, sellerId: farmer._id, ...sellerEditableFilter(now) } as any,
    {
      $set: { ...publishedFields(submission.kind, next), editedAt: now, updatedAt: now },
      $inc: { editCount: 1 },
      $push: logPush,
      ...(expiryChanged ? { $unset: { expiryWarnedAt: "", expiryHiddenNotifiedAt: "" } } : {}),
    } as any
  )
  if (published.matchedCount === 0) {
    const current = await services.findOne({ _id: serviceId }, { projection: { listingStatus: 1 } })
    if (!current) throw new ListingRequestError("This listing is no longer on the marketplace")
    throw new ListingRequestError(
      current.listingStatus === "sold" || current.listingStatus === "withdrawn"
        ? `This ${noun(submission.kind)} has been sold or withdrawn, so it can't be edited`
        : `A buyer is arranging this ${noun(submission.kind)} right now, so it can't be edited until that finishes`
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

/**
 * A pharmacy or feed supplier setting how many units of a published product it has.
 * Goes live at once and without review - it is a count, not a change to what is being
 * sold - so nobody is notified. Setting 0 takes the product off its storefront;
 * anything above brings it back.
 */
export async function updateListingStock(
  id: string,
  seller: { _id: string },
  stock: number,
  lowStockAt?: number
): Promise<void> {
  const request = await getRequestById(id)
  const kind = request ? listingKindOf(request) : null
  if (!request || !kind || request.farmerId !== seller._id || request.farmerDeletedAt || kind === "animal") {
    throw new ListingRequestError("Request not found")
  }
  if (request.status !== "approved" || !request.publishedServiceId) {
    throw new ListingRequestError(`Only a published ${noun(kind)} has stock to update`)
  }
  if (request.removal?.status === "approved") {
    throw new ListingRequestError(`This ${noun(kind)} was removed from ${STOREFRONT_NAME[kind]}`)
  }
  if (!(await setStock(request.publishedServiceId, stock, { sellerId: seller._id, lowStockAt }))) {
    throw new ListingRequestError(`This ${noun(kind)} is no longer on ${STOREFRONT_NAME[kind]}`)
  }
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
    kind: listingKindOf(request),
    farmerId: request.farmerId,
    farmerName: request.farmerName,
    animalId: request.animalId,
    title: request.title,
    animalType: request.animalType,
    breed: request.breed,
    age: request.age,
    sex: request.sex,
    drugType: request.drugType ?? null,
    usageDescription: request.usageDescription ?? null,
    stock: request.stock ?? null,
    expiryDate: request.expiryDate ?? null,
    batchNumber: request.batchNumber ?? null,
    registrationNumber: request.registrationNumber ?? null,
    prescriptionRequired: request.prescriptionRequired === true,
    feedType: request.feedType ?? null,
    quality: request.quality ?? null,
    targetAnimal: request.targetAnimal ?? null,
    unit: request.unit ?? null,
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
