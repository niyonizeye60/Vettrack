export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { todayRwandaRange, buildActivitySummaryGroups } from "@/lib/activity-summary"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const { start, end } = todayRwandaRange()

    const logs = await db.collection("user_activity_logs")
      .find({ userId: new ObjectId(currentUser._id), createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .toArray()

    const groups = buildActivitySummaryGroups(logs as any)
    const totalCount = groups.reduce((sum, g) => sum + g.count, 0)

    return NextResponse.json({ totalCount, groups })
  } catch (error) {
    console.error("Error fetching farmer daily summary:", error)
    return NextResponse.json({ error: "Failed to fetch daily summary" }, { status: 500 })
  }
}
