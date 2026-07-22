export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderById, updateOrderPaymentInit } from "@/lib/db-orders"
import { initiatePesapalPayment } from "@/lib/payments/pesapal"
import { logPaymentEvent } from "@/lib/db-payment-audit"

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
    }

    const order = await getOrderById(orderId)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const result = await initiatePesapalPayment(order)

    await updateOrderPaymentInit(orderId, "pesapal", {
      pesapalOrderTrackingId: result.orderTrackingId,
      pesapalMerchantReference: result.merchantReference,
      pesapalRedirectUrl: result.redirectUrl,
    })

    // Audit log: payment initiated
    await logPaymentEvent("pesapal_initiated", {
      orderId,
      paymentMethod: "pesapal",
      amount: order.total,
      currency: "RWF",
      buyerName: order.buyer.name,
      buyerPhone: order.buyer.phone,
      pesapalOrderTrackingId: result.orderTrackingId,
      pesapalMerchantReference: result.merchantReference,
      payload: { redirectUrl: result.redirectUrl },
    })

    return NextResponse.json({ redirectUrl: result.redirectUrl })
  } catch (error) {
    console.error("Error initiating Pesapal payment:", error)
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 })
  }
}
