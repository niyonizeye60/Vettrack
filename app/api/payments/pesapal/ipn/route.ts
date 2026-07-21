export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderById, updateOrderPaymentStatus, type OrderPaymentStatus } from "@/lib/db-orders"
import { verifyPesapalPaymentStatus } from "@/lib/payments/pesapal"

// pesakit hardcodes IPN registration as notification type 'GET', so Pesapal
// always hits this route with a GET and query-string params, never a POST
// body.
export async function GET(request: NextRequest) {
  const orderTrackingId = request.nextUrl.searchParams.get("OrderTrackingId")
  const orderMerchantReference = request.nextUrl.searchParams.get("OrderMerchantReference")
  const orderNotificationType = request.nextUrl.searchParams.get("OrderNotificationType") || "IPNCHANGE"

  if (!orderTrackingId || !orderMerchantReference) {
    return NextResponse.json({ error: "Missing tracking id or merchant reference" }, { status: 400 })
  }

  try {
    // orderMerchantReference is our own order._id.toString() (that's what we
    // passed as `reference` when creating the payment) — never trust the
    // webhook body/query alone, always re-verify with Pesapal directly.
    const order = await getOrderById(orderMerchantReference)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const verification = await verifyPesapalPaymentStatus(orderTrackingId)
    const status = verification.status.toLowerCase() as OrderPaymentStatus

    await updateOrderPaymentStatus(orderMerchantReference, status, {
      pesapalOrderTrackingId: orderTrackingId,
      pesapalMerchantReference: orderMerchantReference,
    })

    // Pesapal's documented IPN v3 acknowledgement shape.
    return NextResponse.json({
      orderNotificationType,
      orderTrackingId,
      orderMerchantReference,
      status: 200,
    })
  } catch (error) {
    console.error("Error processing Pesapal IPN:", error)
    return NextResponse.json(
      { orderNotificationType, orderTrackingId, orderMerchantReference, status: 500 },
      { status: 500 }
    )
  }
}
