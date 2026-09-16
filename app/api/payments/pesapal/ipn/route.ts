export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getOrderById, updateOrderPaymentStatus, type OrderPaymentStatus } from "@/lib/db-orders"
import { updateBookingPaymentStatus } from "@/lib/db-bookings"
import { verifyPesapalPaymentStatus } from "@/lib/payments/pesapal"
import clientPromise from "@/lib/db"

const DB_NAME = "ntdm_animal_hospital"

// pesakit hardcodes IPN registration as notification type 'GET', so Pesapal
// always hits this route with a GET and query-string params, never a POST
// body.
export async function GET(request: NextRequest) {
  const orderTrackingId = request.nextUrl.searchParams.get("OrderTrackingId")
  const orderMerchantReference = request.nextUrl.searchParams.get("OrderMerchantReference")
  const orderNotificationType = request.nextUrl.searchParams.get("OrderNotificationType") || "IPNCHANGE"

  if (!orderTrackingId || !orderMerchantReference) {
    return NextResponse.json({ error: "Missing tracking id or merchant reference" }, { status: 400 })
  }

  try {
    // orderMerchantReference is our own order._id.toString() / booking._id.toString()
    // (that's what we passed as `reference`/`id` when creating the payment) — never
    // trust the webhook body/query alone, always re-verify with Pesapal directly.
    const order = await getOrderById(orderMerchantReference)
    if (order) {
      const verification = await verifyPesapalPaymentStatus(orderTrackingId)
      const status = verification.status.toLowerCase() as OrderPaymentStatus

      await updateOrderPaymentStatus(orderMerchantReference, status, {
        pesapalOrderTrackingId: orderTrackingId,
        pesapalMerchantReference: orderMerchantReference,
      })

      // Pesapal's documented IPN v3 acknowledgement shape.
      return NextResponse.json({
        orderNotificationType,
        orderTrackingId,
        orderMerchantReference,
        status: 200,
      })
    }

    // Not a marketplace order — check whether this is a booking payment instead.
    // Bookings go through the same Pesapal flow (see pesapal-pay/route.ts) but live
    // in a separate collection, so a miss above doesn't mean the reference is bogus.
    if (ObjectId.isValid(orderMerchantReference)) {
      const client = await clientPromise
      const db = client.db(DB_NAME)
      const booking = await db.collection("bookings").findOne({ _id: new ObjectId(orderMerchantReference) })
      if (booking) {
        const verification = await verifyPesapalPaymentStatus(orderTrackingId)
        const rawStatus = verification.status.toLowerCase()
        const status: "completed" | "failed" | "pending" = rawStatus === "completed" ? "completed" : rawStatus === "pending" ? "pending" : "failed"

        await updateBookingPaymentStatus(orderMerchantReference, status, {
          pesapalOrderTrackingId: orderTrackingId,
          pesapalMerchantReference: orderMerchantReference,
        })

        return NextResponse.json({
          orderNotificationType,
          orderTrackingId,
          orderMerchantReference,
          status: 200,
        })
      }
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  } catch (error) {
    console.error("Error processing Pesapal IPN:", error)
    return NextResponse.json(
      { orderNotificationType, orderTrackingId, orderMerchantReference, status: 500 },
      { status: 500 }
    )
  }
}
