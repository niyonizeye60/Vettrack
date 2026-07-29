export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getOrderByIntouchRequestId, updateOrderPaymentStatus } from "@/lib/db-orders"
import { parseIntouchWebhook, checkIntouchPayStatus } from "@/lib/payments/intouchpay"
import { logPaymentEvent } from "@/lib/db-payment-audit"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

function mapResponseCode(responsecode?: string): "completed" | "pending" | "failed" {
  if (responsecode === "01" || responsecode === "2001") return "completed"
  if (responsecode === "1000") return "pending"
  return "failed"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const webhook = await parseIntouchWebhook(body)

    if (!webhook.requesttransactionid) {
      return NextResponse.json({ error: "Missing requesttransactionid" }, { status: 400 })
    }

    // First, try to find a matching order
    const order = await getOrderByIntouchRequestId(webhook.requesttransactionid)

    if (order) {
      // Process as order payment (existing flow)
      const statusResponse = await checkIntouchPayStatus(webhook.requesttransactionid)
      const status = mapResponseCode(statusResponse.responsecode)

      await updateOrderPaymentStatus(order._id.toString(), status, {
        intouchRequestTransactionId: webhook.requesttransactionid,
        intouchTransactionId: statusResponse.transactionid ?? webhook.transactionid,
        intouchReferenceNo: statusResponse.referenceno ?? webhook.referenceno,
      })

      await logPaymentEvent("intouchpay_callback_received", {
        orderId: order._id.toString(),
        paymentMethod: "intouchpay",
        amount: order.total,
        currency: "RWF",
        buyerName: order.buyer.name,
        buyerPhone: order.buyer.phone,
        intouchRequestTransactionId: webhook.requesttransactionid,
        intouchTransactionId: statusResponse.transactionid ?? webhook.transactionid,
        intouchReferenceNo: statusResponse.referenceno ?? webhook.referenceno,
        previousStatus: order.paymentStatus,
        newStatus: status,
        responseCode: statusResponse.responsecode,
        payload: { webhookStatus: webhook.status, webhookResponseCode: webhook.responsecode },
      })

      return NextResponse.json({ received: true, type: "order" })
    }

    // If no order found, try to find a matching booking
    const client = await clientPromise
    const db = client.db(DB_NAME)

    const booking = await db.collection("bookings").findOne({
      intouchRequestTransactionId: webhook.requesttransactionid
    })

    if (booking) {
      // Process as booking payment
      const statusResponse = await checkIntouchPayStatus(webhook.requesttransactionid)
      const status = mapResponseCode(statusResponse.responsecode)

      const paymentStatus = status === "completed" ? "completed" : status === "pending" ? "pending" : "failed"
      const bookingStatus = paymentStatus === "completed" ? "confirmed" : "payment_failed"

      await db.collection("bookings").updateOne(
        { _id: new ObjectId(booking._id) },
        {
          $set: {
            paymentStatus,
            bookingStatus,
            intouchTransactionId: statusResponse.transactionid ?? webhook.transactionid,
            intouchReferenceNo: statusResponse.referenceno ?? webhook.referenceno,
            paidAt: paymentStatus === "completed" ? new Date() : null,
            updatedAt: new Date(),
          }
        }
      )

      console.log(`Booking ${booking._id} payment status updated to: ${paymentStatus}`)

      return NextResponse.json({ received: true, type: "booking" })
    }

    return NextResponse.json({ error: "No matching order or booking found" }, { status: 404 })
  } catch (error) {
    console.error("Error processing IntouchPay callback:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
