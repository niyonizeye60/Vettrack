export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getOrderById, updateOrderPaymentStatus, type OrderPaymentStatus } from "@/lib/db-orders"
import { updateBookingPaymentStatus } from "@/lib/db-bookings"
import { verifyPesapalPaymentStatus } from "@/lib/payments/pesapal"
import { logPaymentEvent } from "@/lib/db-payment-audit"

const DB_NAME = "ntdm_animal_hospital"

function mapPaymentStatus(status: string): "completed" | "failed" | "pending" {
  const s = status.toLowerCase()
  if (s === "completed") return "completed"
  if (s === "failed" || s === "cancelled" || s === "declined") return "failed"
  return "pending"
}

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
    // orderMerchantReference is our own order/booking _id.toString()
    // (that's what we passed as `reference` when creating the payment)
    // — never trust the webhook body/query alone, always re-verify with Pesapal directly.

    const verification = await verifyPesapalPaymentStatus(orderTrackingId)
    const paymentStatus = mapPaymentStatus(verification.status)

    // Try order first, then booking
    const order = await getOrderById(orderMerchantReference)

    if (order) {
      const status = verification.status.toLowerCase() as OrderPaymentStatus

      await updateOrderPaymentStatus(orderMerchantReference, status, {
        pesapalOrderTrackingId: orderTrackingId,
        pesapalMerchantReference: orderMerchantReference,
      })

      await logPaymentEvent("pesapal_ipn_received", {
        orderId: orderMerchantReference,
        paymentMethod: "pesapal",
        amount: order.total,
        currency: "RWF",
        buyerName: order.buyer.name,
        buyerPhone: order.buyer.phone,
        pesapalOrderTrackingId: orderTrackingId,
        pesapalMerchantReference: orderMerchantReference,
        previousStatus: order.paymentStatus,
        newStatus: status,
        payload: { orderNotificationType },
      })

      return NextResponse.json({
        orderNotificationType,
        orderTrackingId,
        orderMerchantReference,
        status: 200,
      })
    }

    // Not an order — try booking
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(orderMerchantReference)
    })

    if (booking) {
      await updateBookingPaymentStatus(orderMerchantReference, paymentStatus, {
        pesapalOrderTrackingId: orderTrackingId,
        pesapalMerchantReference: orderMerchantReference,
      })

      await logPaymentEvent("pesapal_ipn_received", {
        orderId: orderMerchantReference,
        paymentMethod: "pesapal",
        amount: booking.servicePrice || 100,
        currency: "RWF",
        buyerName: booking.name || "",
        buyerPhone: booking.phone || "",
        pesapalOrderTrackingId: orderTrackingId,
        pesapalMerchantReference: orderMerchantReference,
        previousStatus: booking.paymentStatus || "pending",
        newStatus: paymentStatus,
        payload: { orderNotificationType, type: "booking" },
      })

      return NextResponse.json({
        orderNotificationType,
        orderTrackingId,
        orderMerchantReference,
        status: 200,
      })
    }

    return NextResponse.json({ error: "Order or booking not found" }, { status: 404 })
  } catch (error) {
    console.error("Error processing Pesapal IPN:", error)
    return NextResponse.json(
      { orderNotificationType, orderTrackingId, orderMerchantReference, status: 500 },
      { status: 500 }
    )
  }
}
