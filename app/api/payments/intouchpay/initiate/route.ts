export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderById, updateOrderPaymentInit } from "@/lib/db-orders"
import { initiateIntouchPayment } from "@/lib/payments/intouchpay"
import { intouchPhoneSchema } from "@/lib/validations/checkout"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = intouchPhoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid phone number" }, { status: 400 })
    }

    const orderId = body.orderId as string | undefined
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
    }

    const order = await getOrderById(orderId)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const result = await initiateIntouchPayment(order.total, parsed.data.mobilePhone)

    if (!result.requesttransactionid) {
      return NextResponse.json({ error: result.message || "Failed to start payment" }, { status: 502 })
    }

    await updateOrderPaymentInit(orderId, "intouchpay", {
      intouchRequestTransactionId: result.requesttransactionid,
    })

    return NextResponse.json({ requestTransactionId: result.requesttransactionid })
  } catch (error) {
    console.error("Error initiating IntouchPay payment:", error)
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 })
  }
}
