export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getCommissionStats, getAllPayouts, getPendingPayouts } from "@/lib/db-payouts"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [commissionStats, pendingPayouts, recentPayouts] = await Promise.all([
      getCommissionStats(),
      getPendingPayouts(),
      getAllPayouts(20),
    ])

    return NextResponse.json({
      stats: {
        totalCommission: commissionStats.totalCommission,
        totalSellerAmount: commissionStats.totalSellerAmount,
        totalItems: commissionStats.totalItems,
        paidCommission: commissionStats.paidCommission,
        pendingCommission: commissionStats.pendingCommission,
      },
      pendingPayouts,
      recentPayouts,
    })
  } catch (error) {
    console.error("Error fetching commission data:", error)
    return NextResponse.json({ error: "Failed to fetch commission data" }, { status: 500 })
  }
}
