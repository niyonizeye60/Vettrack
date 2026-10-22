export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getWithdrawalsBySeller,
  getAllWithdrawals,
  getPendingWithdrawals,
  updateWithdrawalStatus,
  getWithdrawalStats,
} from "@/lib/db-withdrawals"
import { getPayoutStats } from "@/lib/db-payouts"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const adminView = searchParams.get("admin") === "true"

    // Admin/superadmin can see all withdrawals
    if (adminView && ["admin", "superadmin"].includes(user.role)) {
      const [allWithdrawals, pendingWithdrawals, stats] = await Promise.all([
        getAllWithdrawals(),
        getPendingWithdrawals(),
        getWithdrawalStats(),
      ])
      return NextResponse.json({
        withdrawals: allWithdrawals.map(w => ({ ...w, _id: w._id.toString() })),
        pendingWithdrawals: pendingWithdrawals.map(w => ({ ...w, _id: w._id.toString() })),
        stats,
      })
    }

    // Regular users see their own withdrawals
    const sellerId = user._id?.toString()
    if (!sellerId) return NextResponse.json({ error: "User ID not found" }, { status: 400 })

    const [withdrawals, stats, payoutStats] = await Promise.all([
      getWithdrawalsBySeller(sellerId),
      getWithdrawalStats(sellerId),
      getPayoutStats(sellerId),
    ])

    const availableBalance = (payoutStats.paidAmount || 0) - (stats.completedAmount || 0) - (stats.approvedAmount || 0)

    return NextResponse.json({
      withdrawals: withdrawals.map(w => ({ ...w, _id: w._id.toString() })),
      stats,
      availableBalance: Math.max(0, availableBalance),
      totalEarned: payoutStats.paidAmount || 0,
    })
  } catch (error) {
    console.error("Error fetching withdrawals:", error)
    return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 })
  }
}

// Sellers are paid only through payouts, which superadmin sends from Commissions.
// Withdrawals counted those same paid payouts as a withdrawable balance, so
// accepting new requests would pay sellers twice. Old records stay readable.
export async function POST() {
  return NextResponse.json(
    { error: "Withdrawals are turned off. Vettrack sends what you're owed for each sale straight to your mobile money number." },
    { status: 410 }
  )
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { withdrawalId, status, adminNote } = body

    if (!withdrawalId || !status) {
      return NextResponse.json({ error: "Missing withdrawalId or status" }, { status: 400 })
    }

    if (!["approved", "rejected", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Closing out old requests only: no money moves here (sellers are paid through payouts).
    await updateWithdrawalStatus(withdrawalId, status, adminNote, user.name || "Admin")

    return NextResponse.json({ success: true, message: `Withdrawal ${status} successfully` })
  } catch (error) {
    console.error("Error updating withdrawal:", error)
    return NextResponse.json({ error: "Failed to update withdrawal" }, { status: 500 })
  }
}
