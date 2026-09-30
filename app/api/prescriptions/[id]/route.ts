export const dynamicParams = true
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { getPrescription } from "@/lib/db-prescriptions"
import { getOrderById } from "@/lib/db-orders"

/**
 * GET - view a buyer's prescription.
 *
 * Only the pharmacy that sold a prescription-only drug on that order (to check it
 * before handing the drug over) and finance staff (to settle a refund over it).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prescription = await getPrescription(params.id)
    if (!prescription || !prescription.orderId) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 })
    }

    let allowed = can(user.role, "finance.refunds")
    if (!allowed && can(user.role, "marketplace.drugs.request")) {
      const order = await getOrderById(prescription.orderId)
      allowed = !!order?.items.some((item) => item.sellerId === user._id && item.prescriptionRequired)
    }
    if (!allowed) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 })
    }

    const fileName = prescription.fileName.replace(/[^\w.\- ]/g, "_")
    return new NextResponse(Buffer.from(prescription.data.buffer), {
      headers: {
        "Content-Type": prescription.contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Error loading prescription:", error)
    return NextResponse.json({ error: "Failed to load prescription" }, { status: 500 })
  }
}
