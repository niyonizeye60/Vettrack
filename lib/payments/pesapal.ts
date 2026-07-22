import Pesakit from "pesakit"
import type { Order } from "@/lib/db-orders"

// The published `pesakit` type definitions (index.d.ts) and README both
// claim `createPayment` resolves to a plain redirect-URL string, and that
// `PaymentData` has no `ipnUrl` field. Neither is true of the actual
// implementation (verified by reading index.js directly):
//   - createPayment returns { orderTrackingId, merchantReference, redirectUrl }
//   - ipnUrl IS accepted (schemas/validation.js) and MUST be passed
//     explicitly, otherwise the SDK derives a broken one from callbackUrl.
// These local types describe the real runtime contract, not the (wrong)
// published one, and callPesapalCreatePayment casts through them.
interface RealPesapalPaymentData {
  amount: number
  description: string
  reference: string
  email: string
  callbackUrl: string
  ipnUrl: string
  currency: "RWF"
  phoneNumber?: string
  firstName?: string
  lastName?: string
}

interface RealCreatePaymentResult {
  orderTrackingId: string
  merchantReference: string
  redirectUrl: string
}

/**
 * Normalise a Rwandan phone number to international format (+250...).
 * Accepts 07XXXXXXXX, 2507XXXXXXXX, or +2507XXXXXXXX.
 */
function toInternationalPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "")
  if (cleaned.startsWith("+250")) return cleaned
  if (cleaned.startsWith("250")) return `+${cleaned}`
  if (cleaned.startsWith("0")) return `+250${cleaned.slice(1)}`
  return phone
}

function getClient() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET
  if (!consumerKey || !consumerSecret) {
    throw new Error("PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET are not configured")
  }
  return new Pesakit({
    consumerKey,
    consumerSecret,
    environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  })
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

export async function initiatePesapalPayment(order: Order): Promise<RealCreatePaymentResult> {
  const client = getClient()
  const baseUrl = getBaseUrl()

  const payload: RealPesapalPaymentData = {
    amount: order.total,
    description: `NTDM order ${order._id.toString()}`,
    reference: order._id.toString(),
    email: order.buyer.email || "no-reply@vettrack.rw",
    callbackUrl: `${baseUrl}/checkout/callback`,
    ipnUrl: `${baseUrl}/api/payments/pesapal/ipn`,
    currency: "RWF",
    phoneNumber: toInternationalPhone(order.buyer.phone),
    firstName: order.buyer.name.split(" ")[0],
    lastName: order.buyer.name.split(" ").slice(1).join(" ") || order.buyer.name,
  }

  const result = (await client.createPayment(payload as unknown as Parameters<typeof client.createPayment>[0])) as unknown as RealCreatePaymentResult
  return result
}

export async function verifyPesapalPaymentStatus(orderTrackingId: string) {
  const client = getClient()
  return client.verifyPayment(orderTrackingId)
}
