export const dynamicParams = true
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { logActivity } from "@/lib/activity-log"
import { completeRefund, declineRefund, RefundError, serializeRefund } from "@/lib/db-refunds"
import { refundDecisionSchema } from "@/lib/validations/refund"

/**
 * PATCH - finance deciding a refund: record that the buyer was paid back (and how),
 * or decline it with a reason.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!can(user.role, "finance.refunds")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const parsed = refundDecisionSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid decision" }, { status: 400 })
    }

    const actor = { _id: user._id, name: user.name, role: user.role }
    if (parsed.data.action === "complete") {
      const refund = await completeRefund(params.id, actor, parsed.data)
      await logActivity(
        user._id,
        "refund.completed",
        `Refunded RWF ${refund.amount} on order ${refund.reference} (${refund.method}, ref ${refund.refundReference})`
      )
      return NextResponse.json(serializeRefund(refund))
    }

    const refund = await declineRefund(params.id, actor, parsed.data.note)
    await logActivity(user._id, "refund.declined", `Declined refund on order ${refund.reference}`)
    return NextResponse.json(serializeRefund(refund))
  } catch (error) {
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error deciding refund:", error)
    return NextResponse.json({ error: "Failed to update refund" }, { status: 500 })
  }
}
