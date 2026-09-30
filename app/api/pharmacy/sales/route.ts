export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { getSalesForSeller } from "@/lib/db-pharmacy-sales"

/** GET - the signed-in pharmacy's own sales. Whose sales is taken from the session, never a parameter. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!can(user.role, "marketplace.drugs.request")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(await getSalesForSeller(user._id))
  } catch (error) {
    console.error("Error loading pharmacy sales:", error)
    return NextResponse.json({ error: "Failed to load sales" }, { status: 500 })
  }
}
