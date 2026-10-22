export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { IntouchPayError } from "@d-merci/intouchpay-client"
import { claimPayoutForSending, markPayoutAsPaid, releasePayoutClaim } from "@/lib/db-payouts"
import { requestIntouchDeposit } from "@/lib/payments/intouchpay"
import clientPromise from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    // Moves real money: superadmin only, like marking a payout paid.
    if (!user || user.role !== "superadmin") {
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

    // Reserve it before any money moves: a double click, a bulk send or a second
    // admin must not send the same payout twice.
    const claimed = await claimPayoutForSending(payoutId)
    if (!claimed) {
      return NextResponse.json({ error: "This payout is already being sent. Refresh in a few minutes to see the result." }, { status: 409 })
    }

    // Send money via IntouchPay deposit API
    const reason = `Commission payout for ${claimed.itemName}`
    let depositResult: Awaited<ReturnType<typeof requestIntouchDeposit>>
    try {
      depositResult = await requestIntouchDeposit(claimed.sellerAmount, claimed.sellerPhone, reason)
    } catch (error) {
      // A response code is Intouch's own refusal, so no money moved: free it for a retry.
      if (error instanceof IntouchPayError && error.response?.responsecode) {
        await releasePayoutClaim(payoutId)
        throw error
      }
      // No answer (timeout, network, gateway error page): the money may have gone.
      // Keep the claim so nobody resends blindly; it lapses after a few minutes.
      console.error("IntouchPay payout outcome unknown:", payoutId, error)
      return NextResponse.json(
        { error: "Intouch didn't answer, so we can't tell whether the money was sent. Check Intouch's transaction logs before trying again in a few minutes." },
        { status: 502 }
      )
    }

    await markPayoutAsPaid(payoutId, {
      requestTransactionId: depositResult.requesttransactionid,
      transactionId: depositResult.transactionid,
      referenceNo: depositResult.referenceno,
      responseCode: depositResult.responsecode,
    })

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
