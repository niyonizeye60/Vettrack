export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ success: false, message: "Missing parameters" })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("notifications").updateMany(
      { 
        $or: [
          { userId: new ObjectId(userId) },
          { targetRole: role },
          { targetRole: "all" },
          { type: "system" }
        ],
        read: false
      },
      { $set: { read: true, readAt: new Date() } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json({ success: false, message: "Failed to mark all as read" })
  }
}