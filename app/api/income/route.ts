export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { listIncome, serializeEntry } from "@/lib/db-income"
import { isIncomeSource } from "@/lib/income-sources"
import { dayEnd, dayStart } from "@/lib/finance-period"

/** Every transaction in a period, optionally narrowed to one income source. */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!can(currentUser.role, "finance.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const now = new Date()
    const fromParam = req.nextUrl.searchParams.get("from")
    const toParam = req.nextUrl.searchParams.get("to")
    const sourceParam = req.nextUrl.searchParams.get("source")

    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    const from = dayStart(fromParam || defaultFrom)
    const to = toParam ? dayEnd(toParam) : now

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    const source = isIncomeSource(sourceParam) ? sourceParam : undefined
    const entries = await listIncome(from, to, source)

    return NextResponse.json({
      total: entries.reduce((sum, entry) => sum + entry.platformRevenue, 0),
      grossTotal: entries.reduce((sum, entry) => sum + entry.grossAmount, 0),
      count: entries.length,
      entries: entries.map(serializeEntry),
    })
  } catch (error) {
    console.error("Error listing income:", error)
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 })
  }
}
