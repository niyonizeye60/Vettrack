export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { recordDueFeedingsForFarmer } from "@/lib/feeding-plans"

// Session-triggered counterpart to the /api/cron/feeding-plans sweep - see
// lib/feeding-plans.ts. Called from useFeedingPlans while a farmer has the app open, and
// by the expenses page before it loads the records; harmless to call repeatedly since
// each day of a plan is only ever written once.
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await recordDueFeedingsForFarmer(currentUser._id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error recording due feeding plans:", error)
    return NextResponse.json({ error: "Failed to record feeding plans" }, { status: 500 })
  }
}
