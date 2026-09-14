export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { getPayoutsBySeller, getPayoutStats, markPayoutAsPaid, getAllPayouts } from "@/lib/db-payouts"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user._id.toString()

    // Only superadmin can see all payouts
    if (user.role === "superadmin") {
      const [payouts, stats] = await Promise.all([
        getAllPayouts(100),
        getPayoutStats(),
      ])
      return NextResponse.json({ payouts, stats, role: user.role })
    }

    // Farmers/vets see their own payouts
    const [payouts, stats] = await Promise.all([
      getPayoutsBySeller(userId),
      getPayoutStats(userId),
    ])

    return NextResponse.json({ payouts, stats, role: user.role })
  } catch (error) {
    console.error("Error fetching payouts:", error)
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { payoutId } = body

    if (!payoutId || !ObjectId.isValid(payoutId)) {
      return NextResponse.json({ error: "Invalid payoutId" }, { status: 400 })
    }

    await markPayoutAsPaid(payoutId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking payout as paid:", error)
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 })
  }
}
