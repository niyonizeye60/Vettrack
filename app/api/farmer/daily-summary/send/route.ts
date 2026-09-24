export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sendDailyActivitySummaryForFarmer } from "@/lib/actions/daily-summary"

// Session-triggered counterpart to the /api/cron/daily-summary sweep - see
// lib/actions/daily-summary.ts for why this path exists. Called from
// useDailySummaryEmail on an interval while a farmer has the app open; harmless
// to call repeatedly since the underlying function gates on time-of-day and is
// idempotent per Kigali day.
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sendDailyActivitySummaryForFarmer(currentUser._id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error sending farmer daily summary email:", error)
    return NextResponse.json({ error: "Failed to send daily summary" }, { status: 500 })
  }
}
