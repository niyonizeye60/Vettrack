export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { checkCalfGraduationRemindersForFarmer } from "@/lib/calf-graduation-reminders"

// Session-triggered counterpart to the /api/cron/calf-graduation-reminders sweep -
// see lib/calf-graduation-reminders.ts. Called from useCalfGraduationReminders on an
// interval while a farmer has the app open; harmless to call repeatedly since each
// calf is only ever announced once (graduationReminderSentAt).
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await checkCalfGraduationRemindersForFarmer(currentUser._id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error checking calf graduation reminders:", error)
    return NextResponse.json({ error: "Failed to check calf graduation reminders" }, { status: 500 })
  }
}
