import type { Order } from "@/lib/db-orders"

// Direct REST client for Pesapal API 3.0, per the official docs:
// https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
// Replaces the `pesakit` npm wrapper, which hung indefinitely on real network
// calls (its circuit-breaker/rate-limiter layer never resolved) and whose
// published types didn't match its own runtime behavior.

const SANDBOX_BASE_URL = process.env.PESAPAL_SANDBOX_URL || "https://cybqa.pesapal.com/pesapalv3"
const PRODUCTION_BASE_URL = process.env.PESAPAL_PRODUCTION_URL || "https://pay.pesapal.com/v3"

// PESAPAL_ENV lets a run explicitly force which Pesapal environment to hit,
// independent of NODE_ENV — e.g. testing production credentials from a local
// dev server, which is otherwise always NODE_ENV=development.
function getBaseUrl() {
  const forced = process.env.PESAPAL_ENV
  if (forced === "production") return PRODUCTION_BASE_URL
  if (forced === "sandbox") return SANDBOX_BASE_URL
  return process.env.NODE_ENV === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

function getCredentials() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET
  if (!consumerKey || !consumerSecret) {
    throw new Error("PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET are not configured")
  }
  return { consumerKey, consumerSecret }
}

interface PesapalError {
  error_type?: string | null
  code?: string | null
  message?: string | null
}

async function pesapalFetch<T>(
  path: string,
  init: RequestInit,
  { timeoutMs = 20_000, throwOnBusinessError = true }: { timeoutMs?: number; throwOnBusinessError?: boolean } = {}
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", ...init.headers },
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Pesapal request to ${path} timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Pesapal returned a non-JSON response from ${path} (HTTP ${res.status}): ${text.slice(0, 300)}`)
  }

  if (!res.ok) {
    throw new Error(`Pesapal ${path} failed (HTTP ${res.status}): ${data?.error?.message || data?.message || text}`)
  }

  // Pesapal API 3.0 returns HTTP 200 even for business-logic failures, with the
  // failure described in a non-null `error` object instead of the status code.
  // GetTransactionStatus is the one exception: it populates `error` (e.g.
  // "Pending Payment" / payment_details_not_found) any time no payment attempt
  // has landed yet, alongside a perfectly valid payment_status_description -
  // that's normal data, not a failure, so callers there opt out of the throw.
  if (throwOnBusinessError) {
    const err = data?.error as PesapalError | null | undefined
    if (err && (err.message || err.code || err.error_type)) {
      throw new Error(`Pesapal ${path} error: ${err.message || err.code || err.error_type}`)
    }
  }

  return data as T
}

// Tokens are valid for 5 minutes (per Pesapal docs). Cached per warm server
// instance; refetched a little early to avoid racing expiry mid-request.
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const { consumerKey, consumerSecret } = getCredentials()
  const data = await pesapalFetch<{ token: string; expiryDate: string }>("/api/Auth/RequestToken", {
    method: "POST",
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  })

  const expiresAt = new Date(data.expiryDate).getTime() - 30_000
  cachedToken = { token: data.token, expiresAt }
  return data.token
}

// Every RegisterIPN call mints a brand-new ipn_id, even for the same URL, so
// registering on every payment would spam Pesapal's dashboard with
// duplicates. PESAPAL_IPN_ID lets a real deployment pin one it registered
// once; otherwise we register lazily and cache it for the process lifetime.
let cachedIpnId: string | null = null

async function getIpnId(): Promise<string> {
  if (process.env.PESAPAL_IPN_ID) return process.env.PESAPAL_IPN_ID
  if (cachedIpnId) return cachedIpnId

  const token = await getAccessToken()
  const ipnUrl = `${getAppBaseUrl()}/api/payments/pesapal/ipn`
  const data = await pesapalFetch<{ ipn_id: string }>("/api/URLSetup/RegisterIPN", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: "GET" }),
  })

  cachedIpnId = data.ipn_id
  return data.ipn_id
}

export interface PesapalInitiateResult {
  orderTrackingId: string
  merchantReference: string
  redirectUrl: string
}

export async function initiatePesapalPayment(
  order: Order,
  callbackPath: string = "/checkout/callback"
): Promise<PesapalInitiateResult> {
  const token = await getAccessToken()
  const notificationId = await getIpnId()
  const baseUrl = getAppBaseUrl()
  const reference = order._id.toString()

  const data = await pesapalFetch<{
    order_tracking_id: string
    merchant_reference: string
    redirect_url: string
  }>("/api/Transactions/SubmitOrderRequest", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      id: reference,
      currency: order.currency,
      amount: order.total,
      description: `NTDM order ${reference}`.slice(0, 100),
      callback_url: `${baseUrl}${callbackPath}`,
      notification_id: notificationId,
      billing_address: {
        email_address: order.buyer.email || "no-reply@vettrack.rw",
        phone_number: order.buyer.phone,
        country_code: "RW",
        first_name: order.buyer.name.split(" ")[0],
        last_name: order.buyer.name.split(" ").slice(1).join(" ") || order.buyer.name,
      },
    }),
  })

  return {
    orderTrackingId: data.order_tracking_id,
    merchantReference: data.merchant_reference,
    redirectUrl: data.redirect_url,
  }
}

export interface PesapalVerification {
  /** Raw `payment_status_description` from Pesapal: INVALID | FAILED | COMPLETED | REVERSED (or PENDING before processing). */
  status: string
}

export async function verifyPesapalPaymentStatus(orderTrackingId: string): Promise<PesapalVerification> {
  const token = await getAccessToken()
  const data = await pesapalFetch<{ payment_status_description: string }>(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
    { throwOnBusinessError: false }
  )

  return { status: data.payment_status_description || "PENDING" }
}
