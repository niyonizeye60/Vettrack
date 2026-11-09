export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { recordAllDueFeedings } from "@/lib/feeding-plans"
import { notifyCronFailure } from "@/lib/cron-failure"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await recordAllDueFeedings()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error running feeding plans cron:", error)
    await notifyCronFailure("feeding-plans", error)
    return NextResponse.json({ error: "Failed to record feeding plans" }, { status: 500 })
  }
}
