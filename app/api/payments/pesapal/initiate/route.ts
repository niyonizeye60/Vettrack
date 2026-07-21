export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderById, updateOrderPaymentInit } from "@/lib/db-orders"
import { initiatePesapalPayment } from "@/lib/payments/pesapal"

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

    return NextResponse.json({ redirectUrl: result.redirectUrl })
  } catch (error) {
    console.error("Error initiating Pesapal payment:", error)
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 })
  }
}
