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

// Used by /checkout/callback right after Pesapal redirects the browser back
// — the IPN webhook and this browser redirect can race, so we proactively
// re-check status here instead of only waiting on the IPN to have landed.
// Also used by /booking/callback for booking payments.
export async function POST(request: NextRequest) {
  try {
    const { orderId, type } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
    }

    const isBooking = type === "booking"

    if (isBooking) {
      // Handle booking verification
      const client = await clientPromise
      const db = client.db(DB_NAME)

      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(orderId)
      })

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      if (!booking.pesapalOrderTrackingId) {
        return NextResponse.json({ error: "Booking was not initiated with Pesapal" }, { status: 400 })
      }

      const verification = await verifyPesapalPaymentStatus(booking.pesapalOrderTrackingId)
      const paymentStatus = mapPaymentStatus(verification.status)

      await updateBookingPaymentStatus(orderId, paymentStatus, {
        pesapalOrderTrackingId: booking.pesapalOrderTrackingId,
        pesapalMerchantReference: booking.pesapalMerchantReference,
      })

      await logPaymentEvent("pesapal_verified", {
        orderId,
        paymentMethod: "pesapal",
        amount: booking.servicePrice || 100,
        currency: "RWF",
        buyerName: booking.name || "",
        buyerPhone: booking.phone || "",
        pesapalOrderTrackingId: booking.pesapalOrderTrackingId,
        pesapalMerchantReference: booking.pesapalMerchantReference,
        previousStatus: booking.paymentStatus || "pending",
        newStatus: paymentStatus,
        payload: { verificationStatus: verification.status, type: "booking" },
      })

      return NextResponse.json({ paymentStatus })
    }

    // Handle order verification (existing flow)
    const order = await getOrderById(orderId)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!order.payment.pesapalOrderTrackingId) {
      return NextResponse.json({ error: "Order was not initiated with Pesapal" }, { status: 400 })
    }

    const verification = await verifyPesapalPaymentStatus(order.payment.pesapalOrderTrackingId)
    const status = verification.status.toLowerCase() as OrderPaymentStatus
    await updateOrderPaymentStatus(orderId, status)

    // Audit log: payment verified via callback redirect
    await logPaymentEvent("pesapal_verified", {
      orderId,
      paymentMethod: "pesapal",
      amount: order.total,
      currency: "RWF",
      buyerName: order.buyer.name,
      buyerPhone: order.buyer.phone,
      pesapalOrderTrackingId: order.payment.pesapalOrderTrackingId,
      pesapalMerchantReference: order.payment.pesapalMerchantReference,
      previousStatus: order.paymentStatus,
      newStatus: status,
      payload: { verificationStatus: verification.status },
    })

    return NextResponse.json({ paymentStatus: status })
  } catch (error) {
    console.error("Error verifying Pesapal payment:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
