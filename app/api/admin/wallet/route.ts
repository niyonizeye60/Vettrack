export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  recordWalletTransaction,
  getWalletTransactions,
  getWalletStats,
} from "@/lib/db-wallet"
import { requestIntouchDeposit } from "@/lib/payments/intouchpay"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !["superadmin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [transactions, stats] = await Promise.all([
      getWalletTransactions(),
      getWalletStats(),
    ])

    return NextResponse.json({
      transactions: transactions.map(t => ({ ...t, _id: t._id.toString() })),
      stats,
    })
  } catch (error) {
    console.error("Error fetching wallet data:", error)
    return NextResponse.json({ error: "Failed to fetch wallet data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["superadmin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, amount, recipientPhone, recipientName, description, reference } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const userId = user._id?.toString() || "unknown"
    const userName = user.name || "Admin"

    // Action: deposit — record a manual deposit into the platform wallet
    if (action === "deposit") {
      const depositId = await recordWalletTransaction({
        type: "deposit",
        amount: Number(amount),
        description: description || "Manual deposit into platform wallet",
        initiatedBy: userId,
        initiatedByName: userName,
        reference,
      })

      return NextResponse.json({
        success: true,
        transactionId: depositId,
        message: `Deposit of RWF ${Number(amount).toLocaleString()} recorded successfully`,
      })
    }

    // Action: direct_send — send money to any phone number via IntouchPay
    if (action === "direct_send") {
      if (!recipientPhone) {
        return NextResponse.json({ error: "Recipient phone number is required" }, { status: 400 })
      }

      // Format phone number: remove spaces, add 250 prefix if needed
      let formattedPhone = recipientPhone.replace(/\s+/g, "")
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "250" + formattedPhone.slice(1)
      } else if (formattedPhone.startsWith("+250")) {
        formattedPhone = formattedPhone.slice(1)
      } else if (!formattedPhone.startsWith("250")) {
        formattedPhone = "250" + formattedPhone
      }

      let depositResult: any = null
      try {
        depositResult = await requestIntouchDeposit(
          Number(amount),
          formattedPhone,
          description || `Admin direct send to ${recipientName || formattedPhone}`
        )
      } catch (sendError: any) {
        return NextResponse.json({
          success: false,
          error: `IntouchPay deposit failed: ${sendError.message}`,
        }, { status: 500 })
      }

      const transactionId = await recordWalletTransaction({
        type: "direct_send",
        amount: Number(amount),
        description: description || `Direct send to ${recipientName || formattedPhone}`,
        recipientPhone: formattedPhone,
        recipientName,
        initiatedBy: userId,
        initiatedByName: userName,
        intouchResponse: depositResult,
      })

      return NextResponse.json({
        success: true,
        transactionId,
        message: `RWF ${Number(amount).toLocaleString()} sent to ${recipientName || formattedPhone} successfully`,
        depositResult,
      })
    }

    // Action: withdraw — admin withdraws money from platform to own mobile money
    if (action === "withdraw") {
      if (!recipientPhone) {
        return NextResponse.json({ error: "Your phone number is required for withdrawal" }, { status: 400 })
      }

      let formattedPhone = recipientPhone.replace(/\s+/g, "")
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "250" + formattedPhone.slice(1)
      } else if (formattedPhone.startsWith("+250")) {
        formattedPhone = formattedPhone.slice(1)
      } else if (!formattedPhone.startsWith("250")) {
        formattedPhone = "250" + formattedPhone
      }

      let depositResult: any = null
      try {
        depositResult = await requestIntouchDeposit(
          Number(amount),
          formattedPhone,
          description || `Admin withdrawal to ${formattedPhone}`
        )
      } catch (sendError: any) {
        return NextResponse.json({
          success: false,
          error: `Withdrawal failed: ${sendError.message}`,
        }, { status: 500 })
      }

      const transactionId = await recordWalletTransaction({
        type: "withdraw",
        amount: Number(amount),
        description: description || `Admin withdrawal to ${formattedPhone}`,
        recipientPhone: formattedPhone,
        recipientName: userName,
        initiatedBy: userId,
        initiatedByName: userName,
        intouchResponse: depositResult,
      })

      return NextResponse.json({
        success: true,
        transactionId,
        message: `RWF ${Number(amount).toLocaleString()} withdrawn to ${formattedPhone} successfully`,
        depositResult,
      })
    }

    return NextResponse.json({ error: "Invalid action. Use: deposit, direct_send, or withdraw" }, { status: 400 })
  } catch (error) {
    console.error("Error processing wallet action:", error)
    return NextResponse.json({ error: "Failed to process wallet action" }, { status: 500 })
  }
}
