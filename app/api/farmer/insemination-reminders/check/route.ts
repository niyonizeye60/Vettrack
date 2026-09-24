export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { checkInseminationRemindersForFarmer } from "@/lib/actions/insemination-reminders"

// Session-triggered counterpart to the /api/cron/insemination-reminders sweep -
// see lib/actions/insemination-reminders.ts for why this path exists. Called
// from useInseminationReminders on an interval while a farmer has the app open;
// harmless to call repeatedly since each record can only fire its 14-day and
// 7-day reminder once (reminder14SentAt/reminder7SentAt).
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await checkInseminationRemindersForFarmer(currentUser._id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error checking insemination reminders:", error)
    return NextResponse.json({ error: "Failed to check insemination reminders" }, { status: 500 })
  }
}
