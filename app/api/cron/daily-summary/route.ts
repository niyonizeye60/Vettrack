export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { sendDailyActivitySummaries } from "@/lib/actions/daily-summary"
import { notifyCronFailure } from "@/lib/actions/superadmin"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendDailyActivitySummaries()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error running daily summary cron:", error)
    await notifyCronFailure("daily-summary", error)
    return NextResponse.json({ error: "Failed to run daily summary" }, { status: 500 })
  }
}
