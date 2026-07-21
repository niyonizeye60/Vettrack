export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderById, updateOrderPaymentStatus, type OrderPaymentStatus } from "@/lib/db-orders"
import { verifyPesapalPaymentStatus } from "@/lib/payments/pesapal"

// Used by /checkout/callback right after Pesapal redirects the browser back
// — the IPN webhook and this browser redirect can race, so we proactively
// re-check status here instead of only waiting on the IPN to have landed.
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

    if (!order.payment.pesapalOrderTrackingId) {
      return NextResponse.json({ error: "Order was not initiated with Pesapal" }, { status: 400 })
    }

    const verification = await verifyPesapalPaymentStatus(order.payment.pesapalOrderTrackingId)
    const status = verification.status.toLowerCase() as OrderPaymentStatus
    await updateOrderPaymentStatus(orderId, status)

    return NextResponse.json({ paymentStatus: status })
  } catch (error) {
    console.error("Error verifying Pesapal payment:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
