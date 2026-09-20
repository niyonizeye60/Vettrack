export const dynamicParams = true
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { canAccessMarketplaceCategory } from "@/lib/marketplace-access"
import { logActivity } from "@/lib/activity-log"
import {
  approveRequest,
  decideRemoval,
  deleteRequestForFarmer,
  editPublishedListing,
  getRequestById,
  rejectRequest,
  requestRemoval,
  resubmitRequest,
  serializeRequest,
  withdrawRequest,
  ListingRequestError,
} from "@/lib/db-listing-requests"
import {
  listingRequestSchema,
  removalDecisionSchema,
  removalRequestSchema,
  reviewDecisionSchema,
} from "@/lib/validations/listing-request"

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
 * DELETE - the owning farmer removing a post from their own list.
 *
 * Only what is off the marketplace: a rejected or withdrawn request, or a published one
 * that has been taken down. The data layer re-checks, so the button's visibility is not
 * the guard.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const request = await getRequestById(params.id)
    if (!request || request.farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }
    if (!can(currentUser.role, "marketplace.listings.request")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await deleteRequestForFarmer(params.id, currentUser._id)
    await logActivity(currentUser._id, "marketplace.request.deleted", `Deleted ${request.title} from their list`)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ListingRequestError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error deleting listing request:", error)
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 })
  }
}

/**
 * PATCH - the two ways a pending request leaves the queue.
 *
 * A reviewer approves or rejects; the owning farmer withdraws a pending request,
 * resubmits a rejected one, edits a published one, or asks for a published one to be
 * removed (which a reviewer then approves or declines). Each transition is guarded inside the data layer by a
 * status filter, so two reviewers racing on the same request cannot both publish
 * the animal and a double-clicked resubmit cannot queue it twice.
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

    // Farmer revising a rejected request and sending it back for another review.
    if (body?.action === "resubmit") {
      if (request.farmerId !== currentUser._id || !can(currentUser.role, "marketplace.listings.request")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const parsed = listingRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid request" },
          { status: 400 }
        )
      }
      const resubmitted = await resubmitRequest(
        params.id,
        { _id: currentUser._id, name: currentUser.name, phone: currentUser.phone, email: currentUser.email },
        parsed.data
      )
      await logActivity(
        currentUser._id,
        "marketplace.request.resubmitted",
        `Resubmitted ${parsed.data.title} (attempt ${(resubmitted.resubmitCount ?? 0) + 1})`
      )
      return NextResponse.json(serializeRequest(resubmitted))
    }

    // Farmer changing a listing that is already live. It stays live; the marketplace is
    // told what changed.
    if (body?.action === "edit") {
      if (request.farmerId !== currentUser._id || !can(currentUser.role, "marketplace.listings.request")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const parsed = listingRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid request" },
          { status: 400 }
        )
      }
      const { request: edited, changes } = await editPublishedListing(
        params.id,
        { _id: currentUser._id, name: currentUser.name, phone: currentUser.phone, email: currentUser.email },
        parsed.data
      )
      await logActivity(
        currentUser._id,
        "marketplace.listing.edited",
        `Edited ${edited.title}: ${changes.map((c) => c.field).join(", ")}`
      )
      return NextResponse.json(serializeRequest(edited))
    }

    // Farmer asking for their published listing to be taken down. Staff decide.
    if (body?.action === "request_removal") {
      if (request.farmerId !== currentUser._id || !can(currentUser.role, "marketplace.listings.request")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const parsed = removalRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid request" },
          { status: 400 }
        )
      }
      await requestRemoval(params.id, { _id: currentUser._id, name: currentUser.name }, parsed.data.reason)
      await logActivity(currentUser._id, "marketplace.removal.requested", `Asked to remove ${request.title}`)
      return NextResponse.json({ success: true })
    }

    // Staff answering that ask.
    if (body?.action === "removal_decision") {
      if (!can(currentUser.role, "marketplace.requests.review") || !canAccessMarketplaceCategory(currentUser, "sales")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const parsed = removalDecisionSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid decision" },
          { status: 400 }
        )
      }
      await decideRemoval(params.id, { _id: currentUser._id }, parsed.data.decision, parsed.data.note || undefined)
      await logActivity(
        currentUser._id,
        parsed.data.decision === "approve" ? "marketplace.removal.approved" : "marketplace.removal.declined",
        `${parsed.data.decision === "approve" ? "Approved" : "Declined"} removal of ${request.title} for ${request.farmerName}`
      )
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
