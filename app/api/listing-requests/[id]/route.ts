export const dynamicParams = true
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { canAccessMarketplaceCategory } from "@/lib/marketplace-access"
import { logActivity } from "@/lib/activity-log"
import {
  approveRequest,
  getRequestById,
  rejectRequest,
  serializeRequest,
  withdrawRequest,
  ListingRequestError,
} from "@/lib/db-listing-requests"
import { reviewDecisionSchema } from "@/lib/validations/listing-request"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const request = await getRequestById(params.id)
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Every listing request is for the "sales" category - see the same note in
    // app/api/listing-requests/route.ts.
    const isReviewer =
      can(currentUser.role, "marketplace.requests.review") && canAccessMarketplaceCategory(currentUser, "sales")
    if (!isReviewer && request.farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(serializeRequest(request))
  } catch (error) {
    console.error("Error loading listing request:", error)
    return NextResponse.json({ error: "Failed to load request" }, { status: 500 })
  }
}

/**
 * PATCH - the two ways a pending request leaves the queue.
 *
 * A reviewer approves or rejects; the owning farmer withdraws. Both paths are
 * guarded inside the data layer by a `status: "pending"` filter, so two reviewers
 * racing on the same request cannot both publish the animal.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const request = await getRequestById(params.id)
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const body = await req.json()

    // Farmer withdrawing their own request.
    if (body?.action === "withdraw") {
      if (request.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      await withdrawRequest(params.id, currentUser._id)
      await logActivity(currentUser._id, "marketplace.request.withdrawn", `Withdrew ${request.title}`)
      return NextResponse.json({ success: true })
    }

    // Everything else is a review decision.
    if (!can(currentUser.role, "marketplace.requests.review") || !canAccessMarketplaceCategory(currentUser, "sales")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const parsed = reviewDecisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid decision" },
        { status: 400 }
      )
    }

    if (parsed.data.decision === "approve") {
      const { serviceId } = await approveRequest(
        params.id,
        { _id: currentUser._id },
        parsed.data.categoryId,
        parsed.data.note || undefined
      )
      await logActivity(
        currentUser._id,
        "marketplace.request.approved",
        `Published ${request.title} for ${request.farmerName}`
      )
      return NextResponse.json({ success: true, serviceId })
    }

    await rejectRequest(params.id, { _id: currentUser._id }, parsed.data.note)
    await logActivity(
      currentUser._id,
      "marketplace.request.rejected",
      `Rejected ${request.title} for ${request.farmerName}`
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ListingRequestError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error reviewing listing request:", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
