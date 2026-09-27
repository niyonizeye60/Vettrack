export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"

/**
 * Mark everything in the caller's own feed as read.
 *
 * This used to take userId/role from the body and also matched every `type: "system"`
 * notification, so any user pressing "mark all read" cleared superadmin's system
 * alerts. It now touches only what the caller's feed shows.
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const notifications = client.db("ntdm_animal_hospital").collection("notifications")
    const now = new Date()

    await Promise.all([
      ObjectId.isValid(user._id)
        ? notifications.updateMany(
            { userId: new ObjectId(user._id), read: false },
            { $set: { read: true, readAt: now } }
          )
        : Promise.resolve(),
      // Broadcasts are read per user - see lib/notification-access.ts.
      notifications.updateMany(
        { userId: { $exists: false }, targetRole: { $in: [user.role, "all"] } },
        { $addToSet: { readBy: user._id } }
      ),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json({ success: false, message: "Failed to mark all as read" })
  }
}
