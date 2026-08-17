export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { sendInseminationReminders } from "@/lib/actions/insemination-reminders"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendInseminationReminders()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error running insemination reminder cron:", error)
    return NextResponse.json({ error: "Failed to run insemination reminders" }, { status: 500 })
  }
}
