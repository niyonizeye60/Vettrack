export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderByIntouchRequestId, updateOrderPaymentStatus } from "@/lib/db-orders"
import { parseIntouchWebhook, checkIntouchPayStatus } from "@/lib/payments/intouchpay"
import { logPaymentEvent } from "@/lib/db-payment-audit"

function mapResponseCode(responsecode?: string): "completed" | "pending" | "failed" {
  if (responsecode === "01" || responsecode === "2001") return "completed"
  if (responsecode === "1000") return "pending"
  return "failed"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const webhook = await parseIntouchWebhook(body)

    if (!webhook.requesttransactionid) {
      return NextResponse.json({ error: "Missing requesttransactionid" }, { status: 400 })
    }

    const order = await getOrderByIntouchRequestId(webhook.requesttransactionid)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Don't trust the webhook body as the source of truth — re-fetch
    // authoritative status directly from IntouchPay.
    const statusResponse = await checkIntouchPayStatus(webhook.requesttransactionid)
    const status = mapResponseCode(statusResponse.responsecode)

    await updateOrderPaymentStatus(order._id.toString(), status, {
      intouchRequestTransactionId: webhook.requesttransactionid,
      intouchTransactionId: statusResponse.transactionid ?? webhook.transactionid,
      intouchReferenceNo: statusResponse.referenceno ?? webhook.referenceno,
    })

    // Audit log: callback processed
    await logPaymentEvent("intouchpay_callback_received", {
      orderId: order._id.toString(),
      paymentMethod: "intouchpay",
      amount: order.total,
      currency: "RWF",
      buyerName: order.buyer.name,
      buyerPhone: order.buyer.phone,
      intouchRequestTransactionId: webhook.requesttransactionid,
      intouchTransactionId: statusResponse.transactionid ?? webhook.transactionid,
      intouchReferenceNo: statusResponse.referenceno ?? webhook.referenceno,
      previousStatus: order.paymentStatus,
      newStatus: status,
      responseCode: statusResponse.responsecode,
      payload: { webhookStatus: webhook.status, webhookResponseCode: webhook.responsecode },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing IntouchPay callback:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
