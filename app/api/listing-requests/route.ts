export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { canAccessMarketplaceCategory, sellerListingKind } from "@/lib/marketplace-access"
import { logActivity } from "@/lib/activity-log"
import {
  createListingRequest,
  listRemovalRequests,
  listRequests,
  listRequestsForFarmer,
  serializeRequest,
  type ListingRequest,
} from "@/lib/db-listing-requests"
import { getListingVisibility } from "@/lib/db-listings"
import { sweepExpiryAlerts } from "@/lib/product-alerts"
import {
  isListingKind,
  LISTING_KIND_CATEGORY,
  LISTING_REQUEST_STATUSES,
  parseSellerSubmission,
  type ListingRequestStatus,
} from "@/lib/validations/listing-request"

/** One extra query for the whole page, rather than one per approved request. */
async function serializeWithVisibility(requests: ListingRequest[]) {
  const publishedIds = requests.flatMap((r) => (r.publishedServiceId ? [r.publishedServiceId] : []))
  const visibility = await getListingVisibility(publishedIds)
  return requests.map((r) => serializeRequest(r, r.publishedServiceId ? visibility.get(r.publishedServiceId) ?? null : null))
}

/**
 * GET - a seller (farmer, pharmacy or feed supplier) sees their own requests; a
 * reviewer sees the queue for one kind (`?kind=animal|drug|feed`, animals by default).
 *
 * Which list you get is decided by capability, never by a query parameter, so a
 * seller cannot ask for someone else's requests.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (can(currentUser.role, "marketplace.requests.review")) {
      const kindParam = req.nextUrl.searchParams.get("kind")
      const kind = isListingKind(kindParam) ? kindParam : "animal"

      // Each kind publishes into its own category, so reviewing its queue also
      // requires that category - otherwise a marketplace_admin scoped to feeds only
      // could still approve animals or drugs outside their grant.
      if (!canAccessMarketplaceCategory(currentUser, LISTING_KIND_CATEGORY[kind])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      // The removal queue: published listings whose seller has asked for them to come down.
      if (req.nextUrl.searchParams.get("removal") === "pending") {
        return NextResponse.json(await serializeWithVisibility(await listRemovalRequests(kind)))
      }

      const statusParam = req.nextUrl.searchParams.get("status")
      const status = LISTING_REQUEST_STATUSES.includes(statusParam as ListingRequestStatus)
        ? (statusParam as ListingRequestStatus)
        : undefined
      return NextResponse.json(await serializeWithVisibility(await listRequests(kind, status)))
    }

    if (sellerListingKind(currentUser.role)) {
      // A seller checking its products is when an expiry warning is most useful.
      await sweepExpiryAlerts()
      return NextResponse.json(await serializeWithVisibility(await listRequestsForFarmer(currentUser._id)))
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (error) {
    console.error("Error listing listing requests:", error)
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
  }
}

/** POST - a farmer asks Vettrack to sell an animal, a pharmacy to list a drug, a feed supplier to list feed. */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const kind = sellerListingKind(currentUser.role)
    if (!kind) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const parsed = parseSellerSubmission(kind, await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const request = await createListingRequest(
      {
        _id: currentUser._id,
        name: currentUser.name,
        phone: currentUser.phone,
        email: currentUser.email,
      },
      parsed.submission
    )

    await logActivity(
      currentUser._id,
      "marketplace.request.created",
      `Requested ${kind} listing for ${parsed.submission.data.title}`
    )

    return NextResponse.json(serializeRequest(request), { status: 201 })
  } catch (error) {
    console.error("Error creating listing request:", error)
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 })
  }
}
