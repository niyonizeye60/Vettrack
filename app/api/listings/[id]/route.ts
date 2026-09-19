export const dynamicParams = true
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { z } from "zod"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { canAccessMarketplaceCategory } from "@/lib/marketplace-access"
import { logActivity } from "@/lib/activity-log"
import { setListingHidden, ListingVisibilityError } from "@/lib/db-listings"

const bodySchema = z.object({
  action: z.enum(["hide", "show"]),
  /** Shown to the seller, who is notified. */
  reason: z.string().trim().max(300).optional(),
})

/**
 * PATCH - take a published listing off the public pages, or put it back.
 *
 * Marketplace staff only, and only in a category they hold. Sellers don't hide their
 * own listings: they ask for removal (PATCH /api/listing-requests/[id]) and staff
 * decide. Hiding never deletes anything - orders, the approved request and the
 * listing itself stay intact.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!can(currentUser.role, "marketplace.listings.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const client = await clientPromise
    const listing = await client
      .db("ntdm_animal_hospital")
      .collection("services")
      .findOne({ _id: new ObjectId(params.id) }, { projection: { name: 1, category: 1, sellerId: 1 } })
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }
    if (!canAccessMarketplaceCategory(currentUser, listing.category)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const hidden = parsed.data.action === "hide"
    await setListingHidden(
      { _id: listing._id, name: listing.name, sellerId: listing.sellerId },
      hidden,
      parsed.data.reason
    )

    await logActivity(
      currentUser._id,
      hidden ? "marketplace.listing.hidden" : "marketplace.listing.shown",
      `${hidden ? "Hid" : "Showed"} listing ${listing.name ?? params.id}`
    )

    return NextResponse.json({ success: true, hidden })
  } catch (error) {
    if (error instanceof ListingVisibilityError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error changing listing visibility:", error)
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 })
  }
}
