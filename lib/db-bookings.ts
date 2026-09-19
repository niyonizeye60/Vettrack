import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

/**
 * IntouchPay's requestPayment doesn't accept our own booking id as a
 * reference — it generates its own `requesttransactionid`. We store that id
 * on the booking right after initiating payment (top-level field, mirroring
 * how /api/bookings/pay writes it), then use this to correlate the async
 * callback back to the right booking.
 */
export async function getBookingByIntouchRequestId(
  requestTransactionId: string
): Promise<{ _id: ObjectId; paymentStatus: string } | null> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  return db
    .collection<{ _id: ObjectId; paymentStatus: string }>("bookings")
    .findOne(
      { intouchRequestTransactionId: requestTransactionId },
      { projection: { paymentStatus: 1 } }
    )
}

/**
 * Update a booking's payment and booking status after a payment event.
 * Used by the Pesapal IPN handler, the verify endpoint, and the IntouchPay
 * callback route.
 */
export async function updateBookingPaymentStatus(
  bookingId: string,
  paymentStatus: "completed" | "failed" | "pending",
  paymentData?: {
    // Pesapal IPN handler / verify endpoint
    pesapalOrderTrackingId?: string
    pesapalMerchantReference?: string
    // IntouchPay callback route
    intouchRequestTransactionId?: string
    intouchTransactionId?: string
    intouchReferenceNo?: string
    intouchVerifiedVia?: "status-api" | "webhook-body"
  }
) {
  const client = await clientPromise
  const db = client.db(DB_NAME)

  const bookingStatus = paymentStatus === "completed" ? "confirmed" :
    paymentStatus === "failed" ? "payment_failed" : "pending_payment"

  const update: Record<string, unknown> = {
    paymentStatus,
    bookingStatus,
    updatedAt: new Date(),
  }

  if (paymentData) {
    for (const [key, value] of Object.entries(paymentData)) {
      if (value !== undefined) update[key] = value
    }
  }

  if (paymentStatus === "completed") {
    update.paidAt = new Date()
  }

  await db.collection("bookings").updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: update }
  )
}
