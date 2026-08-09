export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getCommissionPercentage, setCommissionPercentage, getAllSettings } from "@/lib/db-settings"
import { COMMISSION_PERCENTAGE } from "@/lib/constants"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getAllSettings()
    const commissionPct = await getCommissionPercentage()

    return NextResponse.json({
      settings,
      commissionPercentage: commissionPct,
      defaultCommissionPercentage: COMMISSION_PERCENTAGE,
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (body.commissionPercentage !== undefined) {
      const pct = Number(body.commissionPercentage)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ error: "Commission percentage must be between 0 and 100" }, { status: 400 })
      }
      await setCommissionPercentage(pct)
    }

    return NextResponse.json({
      success: true,
      commissionPercentage: await getCommissionPercentage(),
    })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
