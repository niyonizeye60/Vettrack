export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { runAdminTimedAlerts } from "@/lib/admin-alerts"
import { notifyCronFailure } from "@/lib/cron-failure"

// Daily sweep for the admin alerts about things left waiting (lib/admin-alerts.ts). Admins
// with the portal open also trigger it through /api/admin/alerts/check, so the alerts
// don't wait for this run.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runAdminTimedAlerts()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error running admin alerts cron:", error)
    await notifyCronFailure("admin-alerts", error)
    return NextResponse.json({ error: "Failed to run admin alerts" }, { status: 500 })
  }
}
