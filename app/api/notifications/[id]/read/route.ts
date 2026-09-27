export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { audienceFilter, isPersonal } from "@/lib/notification-access"

/** Mark one notification in the caller's own feed as read. */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
    }

    const client = await clientPromise
    const notifications = client.db("ntdm_animal_hospital").collection("notifications")

    const doc = await notifications.findOne(
      { _id: new ObjectId(params.id), ...audienceFilter(user) },
      { projection: { userId: 1 } }
    )
    if (!doc) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404 })
    }

    // A broadcast is read per user; flipping its shared `read` flag would read it for everyone.
    await notifications.updateOne(
      { _id: doc._id },
      isPersonal(doc)
        ? { $set: { read: true, readAt: new Date() } }
        : { $addToSet: { readBy: user._id } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ success: false, message: "Failed to mark as read" })
  }
}
