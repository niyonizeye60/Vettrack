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

function isLocalhost(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1") || url.includes("::1")
}

/**
 * Get a fresh OAuth token directly from Pesapal's API.
 * Bypasses any cached/stale tokens from the pesakit client's circuit breaker.
 */
async function getFreshOAuthToken(
  consumerKey: string,
  consumerSecret: string,
  baseApiUrl: string,
): Promise<string> {
  const response = await fetch(
    `${baseApiUrl}/api/Auth/RequestToken`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      }),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 15000); return c.signal; })(),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pesapal auth returned ${response.status}: ${text}`)
  }

  const data = await response.json()
  // Pesapal v3 auth response uses "token" field, but some versions use "access_token"
  console.log("🔑 Pesapal auth response keys:", Object.keys(data))
  const token = data.token || data.access_token
  if (!token) {
    throw new Error(`Pesapal auth response missing token field. Keys: ${Object.keys(data).join(", ")}`)
  }
  return token
}

/**
 * Fallback: Submit order directly to Pesapal API via fetch when IPN registration fails.
 * This allows local development testing where Pesapal can't reach localhost for IPN.
 */
async function submitOrderDirect(
  token: string,
  baseApiUrl: string,
  paymentData: RealPesapalPaymentData,
): Promise<RealCreatePaymentResult> {
  const payload = {
    id: paymentData.reference,
    currency: paymentData.currency,
    amount: paymentData.amount,
    description: paymentData.description,
    callback_url: paymentData.callbackUrl,
    notification_id: "",
    billing_address: {
      email_address: paymentData.email,
      phone_number: paymentData.phoneNumber,
      first_name: paymentData.firstName,
      last_name: paymentData.lastName,
      // Pesapal expects 'KE' as the default country code in sandbox
      country_code: "KE",
    },
  }

  const response = await fetch(
    `${baseApiUrl}/api/Transactions/SubmitOrderRequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 15000); return c.signal; })(),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pesapal API responded with ${response.status}: ${text}`)
  }

  const data = await response.json()

  return {
    orderTrackingId: data.order_tracking_id,
    merchantReference: data.merchant_reference,
    redirectUrl: data.redirect_url,
  }
}

export async function initiatePesapalPayment(order: Order, callbackPath?: string): Promise<RealCreatePaymentResult> {
  const client = getClient()
  const baseUrl = getBaseUrl()
  const isDevLocalhost = isLocalhost(baseUrl)

  const ipnUrl = `${baseUrl}/api/payments/pesapal/ipn`
  const payload: RealPesapalPaymentData = {
    amount: order.total,
    description: `${callbackPath?.includes("booking") ? "NTDM booking" : "NTDM order"} ${order._id.toString()}`,
    reference: order._id.toString(),
    email: order.buyer.email || "no-reply@vettrack.rw",
    callbackUrl: `${baseUrl}${callbackPath || "/checkout/callback"}`,
    ipnUrl,
    currency: "RWF",
    phoneNumber: toInternationalPhone(order.buyer.phone),
    firstName: order.buyer.name.split(" ")[0],
    lastName: order.buyer.name.split(" ").slice(1).join(" ") || order.buyer.name,
  }

  try {
    // Step 1: Try normal flow via pesakit library
    const result = await (client as any).createPayment(payload)
    return result as RealCreatePaymentResult
  } catch (error: any) {
    // IPN registration fails on localhost (Pesapal can't reach it).
    // Fall back to direct API submission without IPN.
    if (isDevLocalhost) {
      console.warn("⚠️  IPN registration failed (localhost). Trying direct API submission...")

      try {
        // Step 2: Get a FRESH OAuth token directly from Pesapal (bypasses stale token cache)
        const consumerKey = process.env.PESAPAL_CONSUMER_KEY!
        const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET!
        const baseApiUrl =
          process.env.NODE_ENV === "production"
            ? "https://pay.pesapal.com/v3"
            : "https://cybqa.pesapal.com/pesapalv3"
        const token = await getFreshOAuthToken(consumerKey, consumerSecret, baseApiUrl)

        // Step 3: Submit the order directly via fetch (without IPN dependency)
        const directResult = await submitOrderDirect(token, baseApiUrl, payload)

        console.log("✅ Pesapal payment created via direct API (no IPN)")
        return directResult
      } catch (directError: any) {
        console.error("❌ Direct API also failed:", directError.message || directError)
        throw new Error(
          "Pesapal sandbox IPN registration failed because localhost isn't publicly accessible. " +
            "To test card payments locally:\n" +
            "1. Set NEXT_PUBLIC_BASE_URL to a public ngrok URL, OR\n" +
            "2. Deploy to Vercel for testing, OR\n" +
            "3. Use production Pesapal credentials on your live domain",
        )
      }
    }

    throw error
  }
}

export async function verifyPesapalPaymentStatus(orderTrackingId: string) {
  const client = getClient()
  return client.verifyPayment(orderTrackingId)
}
