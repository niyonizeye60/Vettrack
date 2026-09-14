export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { checkIntouchPayStatus } from "@/lib/payments/intouchpay"
import { updateBookingPaymentStatus } from "@/lib/db-bookings"

const DB_NAME = "ntdm_animal_hospital"
const STALE_CHECK_MS = 5000

// All booking services are a flat 100 RWF booking fee
const BOOKING_FEE = 100
const SERVICE_PRICES: Record<string, number> = {
  "basic-tracking": BOOKING_FEE,
  "advanced-monitoring": BOOKING_FEE,
  "herd-management": BOOKING_FEE,
  "pet-tracking": BOOKING_FEE,
  "general-consultation": BOOKING_FEE,
  "virtual-consultation": BOOKING_FEE,
  "emergency-consultation": BOOKING_FEE,
  "farm-visit": BOOKING_FEE,
  "disease-screening": BOOKING_FEE,
  "vaccination-program": BOOKING_FEE,
  "parasite-control": BOOKING_FEE,
  "reproductive-health": BOOKING_FEE,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, service, animalType, animalCount, description, date, timeSlot, paymentMethod, mobileMoneyPhone } = body

    // Validate required fields
    if (!name || !phone || !service || !date || !timeSlot || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate payment method
    if (!["intouchpay", "pesapal"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    // Get service price
    const price = SERVICE_PRICES[service]
    if (!price) {
      return NextResponse.json({ error: "Invalid service selected" }, { status: 400 })
    }

    // Validate payment phone for mobile money
    if (paymentMethod === "intouchpay" && !mobileMoneyPhone) {
      return NextResponse.json({ error: "Mobile money phone number is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Create booking record
    const booking = {
      name,
      phone,
      email: email || null,
      service,
      servicePrice: price,
      animalType,
      animalCount: parseInt(animalCount) || 1,
      description: description || null,
      date,
      timeSlot,
      paymentMethod,
      mobileMoneyPhone: mobileMoneyPhone || null,
      paymentStatus: "pending",
      bookingStatus: "pending_payment", // pending_payment -> paid -> confirmed
      createdAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(booking)

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId.toString(),
      price,
      message: "Booking created. Please complete payment to confirm."
    })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("id")

    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Fetching a specific booking by ID — no auth required (used for payment polling)
    if (bookingId) {
      const { ObjectId } = await import("mongodb")
      if (!ObjectId.isValid(bookingId)) {
        return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
      }
      let booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) })
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      // Stale-pending IntouchPay re-verification — if the booking has been
      // pending for >5s and has an intouchRequestTransactionId, check
      // IntouchPay directly. This handles cases where the async callback
      // never arrives (e.g. running on localhost).
      const isStalePendingIntouch =
        booking.paymentStatus === "pending" &&
        booking.intouchRequestTransactionId &&
        Date.now() - new Date(booking.updatedAt || booking.createdAt).getTime() > STALE_CHECK_MS

      if (isStalePendingIntouch) {
        try {
          const statusResponse = await checkIntouchPayStatus(booking.intouchRequestTransactionId)
          if (statusResponse.responsecode === "01" || statusResponse.responsecode === "2001") {
            await updateBookingPaymentStatus(bookingId, "completed")
            // Re-fetch updated booking
            booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) })
          } else if (statusResponse.responsecode && statusResponse.responsecode !== "1000") {
            await updateBookingPaymentStatus(bookingId, "failed")
            booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) })
          }
        } catch (error) {
          // Re-verification failed — keep pending, client can retry
          console.error("IntouchPay stale-pending re-check failed:", error)
        }
      }

      // Only return status fields for unauthenticated requests (payment polling)
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ paymentStatus: booking!.paymentStatus, bookingStatus: booking!.bookingStatus })
      }
      return NextResponse.json({ ...booking!, _id: booking!._id.toString() })
    }

    // Listings below require authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Admin/superadmin can see all bookings
    if (["admin", "superadmin"].includes(user.role)) {
      const bookings = await db.collection("bookings").find({}).sort({ createdAt: -1 }).limit(100).toArray()
      return NextResponse.json({ bookings: bookings.map(b => ({ ...b, _id: b._id.toString() })) })
    }

    // Regular users see their own bookings by phone
    const bookings = await db.collection("bookings").find({ phone: (user as any).phone || "" }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json({ bookings: bookings.map(b => ({ ...b, _id: b._id.toString() })) })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}
