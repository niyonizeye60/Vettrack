import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

/**
 * Update a booking's payment and booking status after a payment event.
 * Used by both the Pesapal IPN handler and the verify endpoint.
 */
export async function updateBookingPaymentStatus(
  bookingId: string,
  paymentStatus: "completed" | "failed" | "pending",
  pesapalData?: { pesapalOrderTrackingId: string; pesapalMerchantReference: string }
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

  if (pesapalData) {
    update.pesapalOrderTrackingId = pesapalData.pesapalOrderTrackingId
    update.pesapalMerchantReference = pesapalData.pesapalMerchantReference
  }

  if (paymentStatus === "completed") {
    update.paidAt = new Date()
  }

  await db.collection("bookings").updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: update }
  )
}
