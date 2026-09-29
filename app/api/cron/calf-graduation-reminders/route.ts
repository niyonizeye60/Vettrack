export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { sendCalfGraduationReminders } from "@/lib/calf-graduation-reminders"
import { notifyCronFailure } from "@/lib/actions/superadmin"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendCalfGraduationReminders()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error running calf graduation reminder cron:", error)
    await notifyCronFailure("calf-graduation-reminders", error)
    return NextResponse.json({ error: "Failed to run calf graduation reminders" }, { status: 500 })
  }
}
