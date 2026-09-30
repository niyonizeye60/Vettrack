export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { findOrderByReference, orderReference, refundableQuantities } from "@/lib/db-refunds"

/**
 * GET ?ref=ORD-1A2B3C4D - finance finding a paid order to refund, by the reference on
 * the buyer's receipt or a sale notification. Returns each line with how much of it
 * can still be refunded.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!can(user.role, "finance.refunds")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const ref = req.nextUrl.searchParams.get("ref") ?? ""
    const order = await findOrderByReference(ref)
    if (!order || order.status !== "paid") {
      return NextResponse.json({ error: "No paid order with that reference" }, { status: 404 })
    }

    const refundable = await refundableQuantities(order)
    const sellerIds = [...new Set(order.items.flatMap((item) => (item.sellerId ? [item.sellerId] : [])))]
    const client = await clientPromise
    const sellers = await client
      .db("ntdm_animal_hospital")
      .collection("users")
      .find({ _id: { $in: sellerIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
      .toArray()
    const sellerName = new Map(sellers.map((seller) => [seller._id.toString(), seller.name as string]))

    const id = order._id.toString()
    return NextResponse.json({
      orderId: id,
      reference: orderReference(id),
      paidAt: order.paidAt ?? null,
      paymentMethod: order.paymentMethod ?? null,
      buyer: order.buyer,
      total: order.total,
      refundedAmount: order.refundedAmount ?? 0,
      items: order.items.map((item) => ({
        serviceId: item.serviceId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        seller: item.sellerId ? sellerName.get(item.sellerId) ?? null : null,
        refundable: refundable[item.serviceId] ?? 0,
      })),
    })
  } catch (error) {
    console.error("Error looking up order for refund:", error)
    return NextResponse.json({ error: "Failed to find order" }, { status: 500 })
  }
}
