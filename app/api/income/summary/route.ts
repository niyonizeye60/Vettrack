export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import { getIncomeSummary } from "@/lib/db-income"
import { dayEnd, dayStart } from "@/lib/finance-period"

/** Parse a yyyy-mm-dd bound in Rwanda time, defaulting to the current month. */
function parseRange(req: NextRequest) {
  const now = new Date()
  const fromParam = req.nextUrl.searchParams.get("from")
  const toParam = req.nextUrl.searchParams.get("to")

  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const from = dayStart(fromParam || defaultFrom)
  const to = toParam ? dayEnd(toParam) : now

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null
  return { from, to }
}

/**
 * Totals per income source for a period, plus the same figure for the period
 * immediately before it so the dashboard can show a growth indicator.
 *
 * The comparison window is the same length as the selected one and ends where it
 * begins, so "this month vs last month" and a custom fortnight both behave sensibly.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!can(currentUser.role, "finance.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const range = parseRange(req)
    if (!range) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    const spanMs = range.to.getTime() - range.from.getTime()
    const prevTo = new Date(range.from.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - spanMs)

    const [current, previous] = await Promise.all([
      getIncomeSummary(range.from, range.to),
      getIncomeSummary(prevFrom, prevTo),
    ])

    const total = current.reduce((sum, row) => sum + row.platformRevenue, 0)
    const previousTotal = previous.reduce((sum, row) => sum + row.platformRevenue, 0)
    const grossTotal = current.reduce((sum, row) => sum + row.grossAmount, 0)

    return NextResponse.json({
      from: range.from,
      to: range.to,
      total,
      grossTotal,
      previousTotal,
      // Null rather than 0% when there is nothing to compare against - "+0%" would
      // imply flat performance when it actually means no prior data.
      growthPercent: previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null,
      sources: current,
    })
  } catch (error) {
    console.error("Error building income summary:", error)
    return NextResponse.json({ error: "Failed to load income summary" }, { status: 500 })
  }
}
