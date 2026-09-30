export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { logActivity } from "@/lib/activity-log"
import { createRefundRequest, listRefunds, RefundError, serializeRefund } from "@/lib/db-refunds"
import { REFUND_STATUSES, refundRequestSchema, type RefundStatus } from "@/lib/validations/refund"

/**
 * GET - finance sees every refund (`?status=` to filter); a seller (pharmacy or feed
 * supplier) sees the refunds touching its own items, each showing only its part.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const statusParam = req.nextUrl.searchParams.get("status")
    const status = REFUND_STATUSES.includes(statusParam as RefundStatus) ? (statusParam as RefundStatus) : undefined

    if (can(user.role, "finance.refunds")) {
      const refunds = await listRefunds({ status })
      return NextResponse.json(refunds.map((refund) => serializeRefund(refund)))
    }
    if (can(user.role, "marketplace.sales.own")) {
      const refunds = await listRefunds({ status, sellerId: user._id })
      return NextResponse.json(refunds.map((refund) => serializeRefund(refund, { sellerId: user._id })))
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (error) {
    console.error("Error listing refunds:", error)
    return NextResponse.json({ error: "Failed to load refunds" }, { status: 500 })
  }
}

/**
 * POST - ask for a refund. A seller may only ask about its own items; finance may
 * open one on any line of any paid order. Either way finance then completes or
 * declines it.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const isFinance = can(user.role, "finance.refunds")
    const isSeller = can(user.role, "marketplace.sales.own")
    if (!isFinance && !isSeller) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const parsed = refundRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid refund" }, { status: 400 })
    }

    const refund = await createRefundRequest(
      parsed.data,
      { _id: user._id, name: user.name, role: user.role },
      isFinance ? {} : { sellerId: user._id }
    )
    await logActivity(user._id, "refund.requested", `Asked to refund RWF ${refund.amount} on order ${refund.reference}`)
    return NextResponse.json(serializeRefund(refund, isFinance ? {} : { sellerId: user._id }))
  } catch (error) {
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error requesting refund:", error)
    return NextResponse.json({ error: "Failed to request refund" }, { status: 500 })
  }
}
