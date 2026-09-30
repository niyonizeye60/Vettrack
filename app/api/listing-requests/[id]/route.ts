export const dynamicParams = true
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { canAccessMarketplaceCategory, sellerListingKind } from "@/lib/marketplace-access"
import { logActivity } from "@/lib/activity-log"
import {
  approveRequest,
  decideRemoval,
  deleteRequestForFarmer,
  editPublishedListing,
  getRequestById,
  listingKindOf,
  rejectRequest,
  requestRemoval,
  resubmitRequest,
  serializeRequest,
  updateListingStock,
  withdrawRequest,
  ListingRequestError,
  type ListingRequest,
} from "@/lib/db-listing-requests"
import {
  LISTING_KIND_CATEGORY,
  parseSellerSubmission,
  removalDecisionSchema,
  removalRequestSchema,
  reviewDecisionSchema,
  stockUpdateSchema,
} from "@/lib/validations/listing-request"

type Viewer = { _id: string; role?: string; marketplaceAccess?: unknown }

/**
 * A reviewer for this request: holds the review capability and the category the
 * request publishes into ("sales" for an animal, "drugs" for a drug, "feeds" for feed).
 */
function canReview(user: Viewer, request: ListingRequest) {
  return (
    can(user.role, "marketplace.requests.review") &&
    canAccessMarketplaceCategory(user, LISTING_KIND_CATEGORY[listingKindOf(request)])
  )
}

/** The seller who owns this request, still holding the role that submits its kind. */
function isOwningSeller(user: Viewer, request: ListingRequest) {
  return request.farmerId === user._id && sellerListingKind(user.role) === listingKindOf(request)
}

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

    if (!canReview(currentUser, request) && request.farmerId !== currentUser._id) {
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
    if (!isOwningSeller(currentUser, request)) {
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
 * removed (which a reviewer then approves or declines). A pharmacy or feed supplier
 * also sets the stock of its published products. Each transition is guarded inside the data layer by a
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

    // Seller revising a rejected request and sending it back for another review.
    if (body?.action === "resubmit") {
      if (!isOwningSeller(currentUser, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const parsed = parseSellerSubmission(listingKindOf(request), body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 })
      }
      const resubmitted = await resubmitRequest(
        params.id,
        { _id: currentUser._id, name: currentUser.name, phone: currentUser.phone, email: currentUser.email },
        parsed.submission
      )
      await logActivity(
        currentUser._id,
        "marketplace.request.resubmitted",
        `Resubmitted ${parsed.submission.data.title} (attempt ${(resubmitted.resubmitCount ?? 0) + 1})`
      )
      return NextResponse.json(serializeRequest(resubmitted))
    }

    // Seller changing a listing that is already live. It stays live; the marketplace is
    // told what changed.
    if (body?.action === "edit") {
      if (!isOwningSeller(currentUser, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const parsed = parseSellerSubmission(listingKindOf(request), body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 })
      }
      const { request: edited, changes } = await editPublishedListing(
        params.id,
        { _id: currentUser._id, name: currentUser.name, phone: currentUser.phone, email: currentUser.email },
        parsed.submission
      )
      await logActivity(
        currentUser._id,
        "marketplace.listing.edited",
        `Edited ${edited.title}: ${changes.map((c) => c.field).join(", ")}`
      )
      return NextResponse.json(serializeRequest(edited))
    }

    // Pharmacy or feed supplier setting how many units of a published product it has. Live at once.
    if (body?.action === "stock") {
      if (!isOwningSeller(currentUser, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const parsed = stockUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid stock" },
          { status: 400 }
        )
      }
      await updateListingStock(params.id, { _id: currentUser._id }, parsed.data.stock, parsed.data.lowStockAt)
      await logActivity(currentUser._id, "marketplace.listing.stock", `Set stock of ${request.title} to ${parsed.data.stock}`)
      return NextResponse.json({ success: true })
    }

    // Seller asking for their published listing to be taken down. Staff decide.
    if (body?.action === "request_removal") {
      if (!isOwningSeller(currentUser, request)) {
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
      if (!canReview(currentUser, request)) {
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
    if (!canReview(currentUser, request)) {
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
