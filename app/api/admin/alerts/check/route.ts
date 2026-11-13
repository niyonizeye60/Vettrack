export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runAdminTimedAlerts } from "@/lib/admin-alerts"

// Session-triggered counterpart to the /api/cron/admin-alerts sweep, called while an admin
// has the portal open. Harmless to call often: the checks run at most every 15 minutes
// whoever asks, and nothing is ever alerted twice.
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await runAdminTimedAlerts()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error running admin alert checks:", error)
    return NextResponse.json({ error: "Failed to run admin alert checks" }, { status: 500 })
  }
}
