export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { canAccessMarketplaceCategory } from "@/lib/marketplace-access"
import { logActivity } from "@/lib/activity-log"
import {
  createListingRequest,
  listRequests,
  listRequestsForFarmer,
  serializeRequest,
} from "@/lib/db-listing-requests"
import {
  listingRequestSchema,
  LISTING_REQUEST_STATUSES,
  type ListingRequestStatus,
} from "@/lib/validations/listing-request"

/**
 * GET - a farmer sees their own requests; a reviewer sees the whole queue.
 *
 * Which list you get is decided by capability, never by a query parameter, so a
 * farmer cannot ask for someone else's requests.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Every listing request publishes into the "sales" category, so reviewing the
    // queue also requires "sales" access - otherwise a marketplace_admin scoped to
    // drugs/feeds only could still approve animal listings outside their grant.
    if (can(currentUser.role, "marketplace.requests.review") && canAccessMarketplaceCategory(currentUser, "sales")) {
      const statusParam = req.nextUrl.searchParams.get("status")
      const status = LISTING_REQUEST_STATUSES.includes(statusParam as ListingRequestStatus)
        ? (statusParam as ListingRequestStatus)
        : undefined
      const requests = await listRequests(status)
      return NextResponse.json(requests.map(serializeRequest))
    }

    if (can(currentUser.role, "marketplace.listings.request")) {
      const requests = await listRequestsForFarmer(currentUser._id)
      return NextResponse.json(requests.map(serializeRequest))
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (error) {
    console.error("Error listing listing requests:", error)
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
  }
}

/** POST - a farmer asks Vettrack to sell an animal. */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!can(currentUser.role, "marketplace.listings.request")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const parsed = listingRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      )
    }

    const request = await createListingRequest(
      {
        _id: currentUser._id,
        name: currentUser.name,
        phone: currentUser.phone,
        email: currentUser.email,
      },
      parsed.data
    )

    await logActivity(
      currentUser._id,
      "marketplace.request.created",
      `Requested listing for ${parsed.data.title}`
    )

    return NextResponse.json(serializeRequest(request), { status: 201 })
  } catch (error) {
    console.error("Error creating listing request:", error)
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 })
  }
}
