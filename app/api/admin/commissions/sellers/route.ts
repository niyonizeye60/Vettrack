export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getSellerBreakdown, getPayoutsBySeller } from "@/lib/db-payouts"
import { ObjectId } from "mongodb"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get("sellerId")

    // If a specific sellerId is provided, return their detailed payouts
    if (sellerId) {
      if (!ObjectId.isValid(sellerId)) {
        return NextResponse.json({ error: "Invalid sellerId" }, { status: 400 })
      }
      const payouts = await getPayoutsBySeller(sellerId)
      return NextResponse.json({ payouts, sellerId })
    }

    // Otherwise return the aggregated seller breakdown
    const sellers = await getSellerBreakdown()
    return NextResponse.json({ sellers })
  } catch (error) {
    console.error("Error fetching seller breakdown:", error)
    return NextResponse.json({ error: "Failed to fetch seller data" }, { status: 500 })
  }
}
