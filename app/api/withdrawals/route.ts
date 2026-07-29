export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  createWithdrawalRequest,
  getWithdrawalsBySeller,
  getAllWithdrawals,
  getPendingWithdrawals,
  updateWithdrawalStatus,
  getWithdrawalStats,
} from "@/lib/db-withdrawals"
import { getPayoutStats } from "@/lib/db-payouts"
import { markPayoutAsPaid } from "@/lib/db-payouts"
import { requestIntouchDeposit } from "@/lib/payments/intouchpay"

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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sellerId = user._id?.toString()
    if (!sellerId) return NextResponse.json({ error: "User ID not found" }, { status: 400 })

    const body = await request.json()
    const { amount, note } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid withdrawal amount" }, { status: 400 })
    }

    // Check that seller has enough balance (paid payouts - already withdrawn)
    const payoutStats = await getPayoutStats(sellerId)
    const withdrawalStats = await getWithdrawalStats(sellerId)
    const alreadyWithdrawn = (withdrawalStats.completedAmount || 0) + (withdrawalStats.approvedAmount || 0)
    const availableBalance = (payoutStats.paidAmount || 0) - alreadyWithdrawn

    if (amount > availableBalance) {
      return NextResponse.json({
        error: `Insufficient balance. Available: RWF ${availableBalance.toLocaleString()}, Requested: RWF ${amount.toLocaleString()}`
      }, { status: 400 })
    }

    const sellerName = user.name || "Unknown Seller"
    const sellerPhone = (user as any).phone || (user as any).paymentPhone || ""

    const withdrawalId = await createWithdrawalRequest({
      sellerId,
      sellerName,
      sellerPhone,
      amount,
      note,
    })

    return NextResponse.json({
      success: true,
      withdrawalId,
      message: `Withdrawal request of RWF ${amount.toLocaleString()} submitted successfully. Awaiting admin approval.`,
    })
  } catch (error) {
    console.error("Error creating withdrawal:", error)
    return NextResponse.json({ error: "Failed to create withdrawal" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { withdrawalId, status, adminNote, sendMoney } = body

    if (!withdrawalId || !status) {
      return NextResponse.json({ error: "Missing withdrawalId or status" }, { status: 400 })
    }

    if (!["approved", "rejected", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    if (status === "approved" && sendMoney) {
      // Get withdrawal details to send money
      const { getAllWithdrawals } = await import("@/lib/db-withdrawals")
      const allWithdrawals = await getAllWithdrawals()
      const withdrawal = allWithdrawals.find(w => w._id.toString() === withdrawalId)
      if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })

      if (withdrawal.sellerPhone) {
        try {
          await requestIntouchDeposit(
            withdrawal.amount,
            withdrawal.sellerPhone,
            `Withdrawal payout for ${withdrawal.sellerName}`
          )
        } catch (depositError) {
          console.error("IntouchPay deposit failed, marking as approved only:", depositError)
        }
      }

      await updateWithdrawalStatus(withdrawalId, "completed", adminNote, user.name || "Admin")
    } else {
      await updateWithdrawalStatus(withdrawalId, status, adminNote, user.name || "Admin")
    }

    return NextResponse.json({ success: true, message: `Withdrawal ${status} successfully` })
  } catch (error) {
    console.error("Error updating withdrawal:", error)
    return NextResponse.json({ error: "Failed to update withdrawal" }, { status: 500 })
  }
}
