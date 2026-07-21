export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { createOrder, OrderValidationError } from "@/lib/db-orders"
import { createOrderSchema } from "@/lib/validations/checkout"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid order" }, { status: 400 })
    }

    const buyer = {
      name: parsed.data.buyer.name,
      phone: parsed.data.buyer.phone,
      email: parsed.data.buyer.email || undefined,
      district: parsed.data.buyer.district || undefined,
      sector: parsed.data.buyer.sector || undefined,
      village: parsed.data.buyer.village || undefined,
      notes: parsed.data.buyer.notes || undefined,
    }

    const order = await createOrder(parsed.data.items, buyer)
    return NextResponse.json({ orderId: order._id.toString(), total: order.total })
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
