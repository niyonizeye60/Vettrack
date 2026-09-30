export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getCommissionPercentage, setCommissionPercentage, getAllSettings, getSellByDays, setSellByDays } from "@/lib/db-settings"
import { COMMISSION_PERCENTAGE } from "@/lib/constants"
import { DEFAULT_SELL_BY_DAYS, MAX_SELL_BY_DAYS } from "@/lib/product-rules"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [settings, commissionPct, sellByDays] = await Promise.all([
      getAllSettings(),
      getCommissionPercentage(),
      getSellByDays(),
    ])

    return NextResponse.json({
      settings,
      commissionPercentage: commissionPct,
      defaultCommissionPercentage: COMMISSION_PERCENTAGE,
      sellByDays,
      defaultSellByDays: DEFAULT_SELL_BY_DAYS,
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

    // Days before expiry that drugs and feed stop selling (lib/product-rules.ts).
    if (body.sellByDays !== undefined) {
      const days = Number(body.sellByDays)
      if (!Number.isInteger(days) || days < 0 || days > MAX_SELL_BY_DAYS) {
        return NextResponse.json(
          { error: `The sell-by cutoff must be a whole number of days from 0 to ${MAX_SELL_BY_DAYS}` },
          { status: 400 }
        )
      }
      await setSellByDays(days)
    }

    return NextResponse.json({
      success: true,
      commissionPercentage: await getCommissionPercentage(),
      sellByDays: await getSellByDays(),
    })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
