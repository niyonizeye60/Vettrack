import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import type { ListingRequestInput, ListingRequestStatus } from "@/lib/validations/listing-request"

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
  photos: string[]
  status: ListingRequestStatus
  reviewedBy: ObjectId | null
  reviewedAt: Date | null
  reviewNote: string | null
  publishedServiceId: string | null
  createdAt: Date
  updatedAt: Date
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

/** Notify a farmer about their request. Mirrors the shape used elsewhere in the app. */
async function notifyFarmer(
  farmerId: string,
  title: string,
  message: string,
  actionUrl: string
) {
  try {
    const db = await getDb()
    await db.collection("notifications").insertOne({
      title,
      message,
      type: "marketplace",
      priority: "normal",
      read: false,
      deletedBy: [],
      userId: new ObjectId(farmerId),
      actionUrl,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  } catch (error) {
    // A missing notification must never fail the decision it accompanies.
    console.error("Failed to insert marketplace notification:", error)
  }
}

/** Tell superadmin a new request needs review - the queue otherwise has no push signal. */
async function notifySuperadmin(title: string, message: string, actionUrl: string) {
  try {
    const db = await getDb()
    await db.collection("notifications").insertOne({
      title,
      message,
      type: "marketplace",
      priority: "normal",
      role: "superadmin",
      read: false,
      deletedBy: [],
      actionUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Failed to insert superadmin marketplace notification:", error)
  }
}

export async function createListingRequest(
  farmer: { _id: string; name: string; phone?: string; email: string },
  input: ListingRequestInput
): Promise<ListingRequest> {
  const collection = await getCollection()

  const now = new Date()
  const doc: Omit<ListingRequest, "_id"> = {
    farmerId: farmer._id,
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
    photos: input.photos,
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

export async function listRequestsForFarmer(farmerId: string): Promise<ListingRequest[]> {
  const collection = await getCollection()
  return collection.find({ farmerId }).sort({ createdAt: -1 }).toArray()
}

export async function listRequests(status?: ListingRequestStatus): Promise<ListingRequest[]> {
  const collection = await getCollection()
  const filter = status ? { status } : {}
  // Oldest first while pending, so the queue is genuinely first-come-first-served.
  const sort: Record<string, 1 | -1> = status === "pending" ? { createdAt: 1 } : { updatedAt: -1 }
  return collection.find(filter).sort(sort).toArray()
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
    name: request.title,
    description: request.description,
    price: request.proposedPrice,
    duration: "",
    category: "sales",
    categoryId,
    image: request.photos[0] ?? null,
    images: request.photos,
    animalType: request.animalType,
    breed: request.breed ?? "",
    age: request.age ?? "",
    sex: request.sex ?? "",
    district: request.district,
    sector: request.sector ?? "",
    village: request.village ?? "",
    // Seller contact rides along but is stripped from public API responses -
    // see canViewSellerContact in lib/roles.ts. It is what the connection fee buys.
    sellerPhone: request.sellerPhone,
    sellerEmail: request.sellerEmail,
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
    `"${request.title}" was not published. ${note.trim()}`,
    "/farmer/listings"
  )
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

/** Wire shape - ObjectIds stringified, nothing sensitive added. */
export function serializeRequest(request: ListingRequest) {
  return {
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
    photos: request.photos,
    status: request.status,
    reviewNote: request.reviewNote,
    publishedServiceId: request.publishedServiceId,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}
