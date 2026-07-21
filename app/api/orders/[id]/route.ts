export const dynamicParams = true;
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getOrderById, updateOrderPaymentStatus, type Order } from "@/lib/db-orders"
import { checkIntouchPayStatus } from "@/lib/payments/intouchpay"

const STALE_CHECK_MS = 5000

function mapIntouchResponseCode(responsecode?: string): "completed" | "pending" | "failed" {
  if (responsecode === "01" || responsecode === "2001") return "completed"
  if (responsecode === "1000") return "pending"
  return "failed"
}

function serializeOrder(order: Order) {
  return {
    id: order._id.toString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: order.total,
    currency: order.currency,
    items: order.items,
    buyer: order.buyer,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    let order = await getOrderById(params.id)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const isStalePendingIntouch =
      order.paymentMethod === "intouchpay" &&
      order.paymentStatus === "pending" &&
      order.payment.intouchRequestTransactionId &&
      Date.now() - order.updatedAt.getTime() > STALE_CHECK_MS

    if (isStalePendingIntouch) {
      try {
        const statusResponse = await checkIntouchPayStatus(order.payment.intouchRequestTransactionId!)
        const mapped = mapIntouchResponseCode(statusResponse.responsecode)
        if (mapped !== "pending") {
          await updateOrderPaymentStatus(params.id, mapped, {
            intouchTransactionId: statusResponse.transactionid,
            intouchReferenceNo: statusResponse.referenceno,
          })
          order = await getOrderById(params.id)
        }
      } catch (error) {
        // Fallback poll failed — leave the order pending, the client can retry.
        console.error("IntouchPay status re-check failed:", error)
      }
    }

    return NextResponse.json(serializeOrder(order!))
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}
