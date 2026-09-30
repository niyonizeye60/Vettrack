export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { getSalesForSeller } from "@/lib/db-pharmacy-sales"

/**
 * GET - the signed-in seller's own cart sales (a pharmacy's drugs, a feed supplier's
 * feed). Whose sales is taken from the session, never a parameter.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!can(user.role, "marketplace.sales.own")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(await getSalesForSeller(user._id))
  } catch (error) {
    console.error("Error loading seller sales:", error)
    return NextResponse.json({ error: "Failed to load sales" }, { status: 500 })
  }
}
