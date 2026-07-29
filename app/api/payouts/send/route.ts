export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { markPayoutAsPaid } from "@/lib/db-payouts"
import { requestIntouchDeposit } from "@/lib/payments/intouchpay"
import clientPromise from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { payoutId } = body

    if (!payoutId || !ObjectId.isValid(payoutId)) {
      return NextResponse.json({ error: "Invalid payoutId" }, { status: 400 })
    }

    // Fetch the payout to get seller phone and amount
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const payout = await db.collection("payouts").findOne({ _id: new ObjectId(payoutId) })

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 })
    }

    if (payout.status !== "pending") {
      return NextResponse.json({ error: "Payout is already paid or cancelled" }, { status: 400 })
    }

    if (!payout.sellerPhone) {
      return NextResponse.json({ error: "Seller has no phone number to send payment to" }, { status: 400 })
    }

    // Send money via IntouchPay deposit API
    const reason = `Commission payout for ${payout.itemName}`
    const depositResult = await requestIntouchDeposit(payout.sellerAmount, payout.sellerPhone, reason)

    // Mark the payout as paid in the database
    await markPayoutAsPaid(payoutId)

    return NextResponse.json({
      success: true,
      message: `Successfully sent RWF ${payout.sellerAmount.toLocaleString()} to ${payout.sellerName} (${payout.sellerPhone})`,
      depositResult,
    })
  } catch (error) {
    console.error("Error sending payout:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send payout" },
      { status: 500 }
    )
  }
}
