export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { IntouchPayError } from "@d-merci/intouchpay-client"
import { getOrderByIntouchRequestId, updateOrderPaymentStatus } from "@/lib/db-orders"
import {
  getBookingByIntouchRequestId,
  updateBookingPaymentStatus,
} from "@/lib/db-bookings"
import { parseIntouchWebhook, checkIntouchPayStatus, mapIntouchResponseCode } from "@/lib/payments/intouchpay"
import { logSystemError } from "@/lib/activity-log"

type SettledStatus = "completed" | "pending" | "failed"

async function readWebhookBody(request: NextRequest): Promise<Record<string, unknown>> {
  const rawText = await request.text()
  if (!rawText) return {}

  try {
    const parsed = JSON.parse(rawText)
    if (parsed && typeof parsed === "object") {
      unwrapJsonPayload(parsed)
      return parsed as Record<string, unknown>
    }
  } catch {
    // Fall through to form parsing for x-www-form-urlencoded webhooks.
  }

  const params = new URLSearchParams(rawText)
  if (params.size > 0) {
    const normalized: Record<string, string> = {}
    for (const [key, value] of params.entries()) {
      normalized[key] = value
    }
    // The real gateway posts x-www-form-urlencoded with jsonpayload=<json
    // string>. Unwrap it here or the requesttransactionid stays buried in a
    // string and the webhook is rejected as malformed.
    unwrapJsonPayload(normalized)
    return normalized
  }

  return {}
}

/**
 * The documented webhook shape wraps the fields in `jsonpayload`. Depending on
 * transport it arrives either as a nested object or as a JSON string (form
 * posts / JSON bodies where the gateway stringified it). The SDK's
 * parseWebhook only understands the object form, so normalize both here.
 */
function unwrapJsonPayload(parsed: Record<string, unknown>) {
  const payload = parsed.jsonpayload
  if (typeof payload === "string") {
    try {
      const inner = JSON.parse(payload)
      if (inner && typeof inner === "object") parsed.jsonpayload = inner
    } catch {
      // Leave it as a plain string if the gateway sent a literal payload blob.
    }
  }
}

/**
 * Correlate the webhook's requesttransactionid to the entity it belongs to.
 * Marketplace orders store the id under `payment.*`; bookings store it as a
 * top-level field (written by /api/bookings/pay). Returns null for unknown
 * ids — including forged ones — which the caller rejects.
 */
async function resolveTarget(requestTransactionId: string) {
  const order = await getOrderByIntouchRequestId(requestTransactionId)
  if (order) {
    return {
      kind: "order" as const,
      id: order._id.toString(),
      paymentStatus: order.paymentStatus as "pending" | "completed" | "failed" | "invalid" | "reversed",
    }
  }

  const booking = await getBookingByIntouchRequestId(requestTransactionId)
  if (booking) {
    return {
      kind: "booking" as const,
      id: booking._id.toString(),
      paymentStatus: booking.paymentStatus as "pending" | "completed" | "failed",
    }
  }

  return null
}

/**
 * Shared settlement flow for both entity kinds. `refs` are the gateway
 * breadcrumbs (MoMo tx id / reference / verification method) to merge onto the
 * record along with the status change.
 */
async function settlePayment(
  target: NonNullable<Awaited<ReturnType<typeof resolveTarget>>>,
  refs: {
    intouchRequestTransactionId: string
    intouchTransactionId?: string
    intouchReferenceNo?: string
    intouchVerifiedVia?: "status-api" | "webhook-body"
    responsecode?: string
  }
): Promise<Record<string, unknown>> {
  const isTerminal = (s: string) => s === "completed" || s === "failed" || s === "invalid" || s === "reversed"

  // Don't trust the webhook body as the source of truth — re-fetch
  // authoritative status directly from IntouchPay.
  let status: SettledStatus
  let verifiedVia: "status-api" | "webhook-body" = "status-api"

  try {
    const statusResponse = await checkIntouchPayStatus(refs.intouchRequestTransactionId)
    status = mapIntouchResponseCode(statusResponse.responsecode)
  } catch (statusError) {
    // The SDK throws IntouchPayError when the gateway answers with a
    // definitive non-success code (1005 insufficient funds, 2400 duplicate,
    // ...). That is an AUTHORITATIVE answer, not an outage — map it like a
    // normal response. Treating it as an outage used to send us into
    // webhook-body fallback, where a forged/wrong webhook body claiming "01"
    // could complete a payment the gateway had actually declined.
    if (statusError instanceof IntouchPayError && statusError.response?.responsecode) {
      status = mapIntouchResponseCode(statusError.response.responsecode)
      await applyStatus(target, status, { ...refs, intouchVerifiedVia: "status-api" })
      return { received: true, verified: true, note: "status-api-definitive" }
    }

    // Genuinely unreachable status API (network error, 500 HTML, parse
    // failure). Fall back to verifying the webhook body itself: the
    // requesttransactionid is a server-generated UUID we only ever share with
    // IntouchPay, so a webhook that names a *pending* record we initiated is
    // authentic for practical purposes. The full raw body is logged for audit.
    console.warn(
      "IntouchPay status API unavailable, falling back to webhook-body verification:",
      statusError instanceof Error ? statusError.message : statusError,
    )

    if (isTerminal(target.paymentStatus)) {
      if (target.paymentStatus === "completed" && mapIntouchResponseCode(refs.responsecode) === "completed") {
        // Already paid (e.g. the polling re-check confirmed first) — merge the
        // gateway breadcrumbs so the webhook's MoMo transaction id is still
        // recorded, then acknowledge so the gateway stops retrying.
        await applyStatus(target, "completed", { ...refs, intouchVerifiedVia: "webhook-body" })
      }
      // Any other terminal state: just acknowledge.
      return { received: true, verified: false, note: "already terminal" }
    }

    status = mapIntouchResponseCode(refs.responsecode)
    if (status === "failed") {
      // Never fail a record on an unverifiable webhook — leave it pending
      // so the polling re-check can confirm later when the API recovers.
      return { received: true, verified: false, note: "unverified failure ignored" }
    }
    verifiedVia = "webhook-body"
  }

  await applyStatus(target, status, { ...refs, intouchVerifiedVia: verifiedVia })
  return { received: true }
}

/** Write the status + breadcrumbs through the right store for the entity kind. */
async function applyStatus(
  target: NonNullable<Awaited<ReturnType<typeof resolveTarget>>>,
  status: "completed" | "pending" | "failed",
  refs: {
    intouchRequestTransactionId: string
    intouchTransactionId?: string
    intouchReferenceNo?: string
    intouchVerifiedVia?: "status-api" | "webhook-body"
    responsecode?: string
  }
) {
  const { responsecode: _ignored, ...breadcrumbs } = refs
  if (target.kind === "order") {
    await updateOrderPaymentStatus(target.id, status, breadcrumbs)
  } else {
    await updateBookingPaymentStatus(target.id, status, breadcrumbs)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readWebhookBody(request)
    const webhook = await parseIntouchWebhook(body as any)

    if (!webhook.requesttransactionid) {
      return NextResponse.json({ error: "Missing requesttransactionid" }, { status: 400 })
    }

    const target = await resolveTarget(webhook.requesttransactionid)
    if (!target) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // The gateway gives the callback only ~10s before marking delivery
    // failed (observed live: "Read timed out (read timeout=10)"). Our old
    // flow awaited checkIntouchPayStatus first — which during a status-API
    // outage burns the whole window with SDK retries — so the gateway saw
    // 503/timeout and retried forever. ACK immediately instead; settlement
    // (status re-verification + DB write) continues in the background and is
    // idempotent, and the polling re-check backstops it regardless.
    const refs = {
      intouchRequestTransactionId: webhook.requesttransactionid,
      intouchTransactionId: webhook.transactionid,
      intouchReferenceNo: webhook.referenceno,
      responsecode: webhook.responsecode,
    }
    settlePayment(target, refs).catch(async (error) => {
      console.error("Background settlement failed for", webhook.requesttransactionid, error)
      await logSystemError({
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        action: "payment.intouchpay.callback.settlement",
      }).catch(() => {})
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing IntouchPay callback:", error)
    await logSystemError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: "payment.intouchpay.callback",
    })
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
