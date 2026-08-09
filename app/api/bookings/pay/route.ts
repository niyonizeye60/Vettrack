export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { initiateIntouchPayment } from "@/lib/payments/intouchpay"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, mobileMoneyPhone } = body

    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
    }

    if (!mobileMoneyPhone) {
      return NextResponse.json({ error: "Mobile money phone number is required" }, { status: 400 })
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

    // Format phone number for IntouchPay using shared utility
    const { formatPhoneForIntouchPay } = await import("@/lib/utils")
    const formattedPhone = formatPhoneForIntouchPay(mobileMoneyPhone)

    // Initiate payment via IntouchPay
    const paymentResult = await initiateIntouchPayment(booking.servicePrice, formattedPhone)

    if (!paymentResult.requesttransactionid) {
      return NextResponse.json({
        error: paymentResult.message || "Failed to initiate payment"
      }, { status: 502 })
    }

    // Update booking with payment info
    await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          paymentMethod: "intouchpay",
          mobileMoneyPhone: formattedPhone,
          intouchRequestTransactionId: paymentResult.requesttransactionid,
          paymentStatus: "pending",
          updatedAt: new Date(),
        }
      }
    )

    return NextResponse.json({
      success: true,
      requestTransactionId: paymentResult.requesttransactionid,
      message: "Payment initiated. Please check your phone for the payment prompt."
    })
  } catch (error) {
    console.error("Error initiating booking payment:", error)
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 })
  }
}
