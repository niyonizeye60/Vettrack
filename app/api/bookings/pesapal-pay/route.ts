export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { initiatePesapalPayment } from "@/lib/payments/pesapal"
import { logPaymentEvent } from "@/lib/db-payment-audit"

const DB_NAME = "ntdm_animal_hospital"

/**
 * Minimal shape that matches what initiatePesapalPayment reads off an Order.
 * We derive these fields from the booking so Pesapal can process it.
 */
function bookingToPseudoOrder(booking: any) {
  return {
    _id: { toString: () => booking._id.toString() },
    total: booking.servicePrice || 100,
    buyer: {
      name: booking.name || "Booking Customer",
      phone: booking.phone || "",
      email: booking.email || "no-reply@vettrack.rw",
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)

    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) })
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.bookingStatus === "confirmed") {
      return NextResponse.json({ error: "Booking already confirmed" }, { status: 400 })
    }

    if (booking.paymentStatus === "completed") {
      return NextResponse.json({ error: "Payment already completed" }, { status: 400 })
    }

    // Build a pseudo-order that initiatePesapalPayment can work with
    const pseudoOrder = bookingToPseudoOrder(booking)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const result = await initiatePesapalPayment(pseudoOrder as any, "/booking/callback")

    // Save Pesapal tracking info on the booking
    await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          paymentMethod: "pesapal",
          pesapalOrderTrackingId: result.orderTrackingId,
          pesapalMerchantReference: result.merchantReference,
          pesapalRedirectUrl: result.redirectUrl,
          paymentStatus: "pending",
          updatedAt: new Date(),
        }
      }
    )

    // Audit log
    await logPaymentEvent("pesapal_initiated", {
      orderId: bookingId,
      paymentMethod: "pesapal",
      amount: booking.servicePrice || 100,
      currency: "RWF",
      buyerName: booking.name || "",
      buyerPhone: booking.phone || "",
      pesapalOrderTrackingId: result.orderTrackingId,
      pesapalMerchantReference: result.merchantReference,
      payload: { redirectUrl: result.redirectUrl, type: "booking" },
    })

    return NextResponse.json({ redirectUrl: result.redirectUrl })
  } catch (error) {
    console.error("Error initiating Pesapal payment for booking:", error)
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 })
  }
}
