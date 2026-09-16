export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getOrderById, updateOrderPaymentStatus, type OrderPaymentStatus } from "@/lib/db-orders"
import { updateBookingPaymentStatus } from "@/lib/db-bookings"
import { verifyPesapalPaymentStatus } from "@/lib/payments/pesapal"
import { logSystemError } from "@/lib/activity-log"
import clientPromise from "@/lib/db"

const DB_NAME = "ntdm_animal_hospital"

// Used by /checkout/callback and /booking/callback right after Pesapal
// redirects the browser back — the IPN webhook and this browser redirect can
// race, so we proactively re-check status here instead of only waiting on
// the IPN to have landed.
export async function POST(request: NextRequest) {
  try {
    const { orderId, type } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
    }

    if (type === "booking") {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
      }
      const client = await clientPromise
      const db = client.db(DB_NAME)
      const booking = await db.collection("bookings").findOne({ _id: new ObjectId(orderId) })
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }
      if (!booking.pesapalOrderTrackingId) {
        return NextResponse.json({ error: "Booking was not initiated with Pesapal" }, { status: 400 })
      }

      const verification = await verifyPesapalPaymentStatus(booking.pesapalOrderTrackingId)
      const rawStatus = verification.status.toLowerCase()
      const status: "completed" | "failed" | "pending" = rawStatus === "completed" ? "completed" : rawStatus === "pending" ? "pending" : "failed"
      await updateBookingPaymentStatus(orderId, status)

      return NextResponse.json({ paymentStatus: status })
    }

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

    return NextResponse.json({ paymentStatus: status })
  } catch (error) {
    console.error("Error verifying Pesapal payment:", error)
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "payment.pesapal.verify",
    })
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
