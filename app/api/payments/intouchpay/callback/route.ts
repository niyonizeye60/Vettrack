export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderByIntouchRequestId, updateOrderPaymentStatus } from "@/lib/db-orders"
import {
  getBookingByIntouchRequestId,
  updateBookingPaymentStatus,
} from "@/lib/db-bookings"
import { parseIntouchWebhook, checkIntouchPayStatus } from "@/lib/payments/intouchpay"
import { logSystemError } from "@/lib/activity-log"

function mapResponseCode(responsecode?: string): "completed" | "pending" | "failed" {
  if (responsecode === "01" || responsecode === "2001") return "completed"
  // 1000 is explicitly pending; 3100 ("transaction doesn't exist") also occurs
  // right after initiate on the real gateway before its ledger materializes the
  // transaction - failing the order there would kill legitimate payments.
  if (responsecode === "1000" || responsecode === "3100") return "pending"
  return "failed"
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
  let status: "completed" | "pending" | "failed"
  let verifiedVia: "status-api" | "webhook-body" = "status-api"

  try {
    const statusResponse = await checkIntouchPayStatus(refs.intouchRequestTransactionId)
    status = mapResponseCode(statusResponse.responsecode)
  } catch (statusError) {
    // Gateway status API outage (observed live: their gettransactionstatus
    // returns HTML 500 after authenticating). Fall back to verifying the
    // webhook body itself: the requesttransactionid is a server-generated
    // UUID we only ever share with IntouchPay, so a webhook that names a
    // *pending* record we initiated is authentic for practical purposes.
    // The full raw body is logged for audit either way.
    console.warn(
      "IntouchPay status API unavailable, falling back to webhook-body verification:",
      statusError instanceof Error ? statusError.message : statusError,
    )

    if (isTerminal(target.paymentStatus)) {
      if (target.paymentStatus === "completed" && mapResponseCode(refs.responsecode) === "completed") {
        // Already paid (e.g. the polling re-check confirmed first) — merge the
        // gateway breadcrumbs so the webhook's MoMo transaction id is still
        // recorded, then acknowledge so the gateway stops retrying.
        await applyStatus(target, "completed", { ...refs, intouchVerifiedVia: "webhook-body" })
      }
      // Any other terminal state: just acknowledge.
      return { received: true, verified: false, note: "already terminal" }
    }

    status = mapResponseCode(refs.responsecode)
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
    const body = await request.json()
    const webhook = await parseIntouchWebhook(body)

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
