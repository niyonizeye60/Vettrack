export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { audienceFilter, isReadBy } from "@/lib/notification-access"

// Every handler here identifies the caller from their session. The userId/role query
// parameters older clients still send are ignored: trusting them let anyone read,
// hide or delete anyone else's notifications.

const unauthorized = () => NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
const forbidden = () => NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const now = new Date()

    // Superadmin's management view: every notification, unfiltered.
    if (searchParams.get('superadmin') === 'true') {
      if (user.role !== "superadmin") return forbidden()

      const notifications = await db.collection("notifications")
        .find({})
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray()

      return NextResponse.json({
        success: true,
        notifications: notifications.map(n => ({
          _id: n._id.toString(),
          title: n.title,
          message: n.message,
          type: n.type,
          priority: n.priority || "normal",
          read: n.read || false,
          createdAt: n.createdAt,
          expiresAt: n.expiresAt || null,
          deletedBy: n.deletedBy || [],
          actionUrl: n.actionUrl || null
        }))
      })
    }

    // Everyone else: their own feed, minus expired and hidden items.
    const query: any = {
      $and: [
        audienceFilter(user),
        { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }] },
        { $or: [{ deletedBy: { $exists: false } }, { deletedBy: { $not: { $elemMatch: { $eq: user._id } } } }] }
      ]
    }

    const notifications = await db.collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json({
      success: true,
      notifications: notifications.map(n => ({
        _id: n._id.toString(),
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority || "normal",
        read: isReadBy(n, user._id),
        createdAt: n.createdAt,
        expiresAt: n.expiresAt || null,
        actionUrl: n.actionUrl || null
      }))
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch notifications" })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const permanent = searchParams.get('permanent') === 'true'

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Missing or invalid id" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    if (permanent) {
      // Only superadmin removes a notification for everyone.
      if (user.role !== "superadmin") return forbidden()
      await db.collection("notifications").deleteOne({ _id: new ObjectId(id) })
      return NextResponse.json({ success: true })
    }

    // Hiding it from your own feed - only a notification that is in your feed.
    const result = await db.collection("notifications").updateOne(
      { _id: new ObjectId(id), ...audienceFilter(user) },
      { $addToSet: { deletedBy: user._id } }
    )
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ success: false, message: "Failed to delete notification" })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    // Restoring hidden notifications is a superadmin tool.
    if (user.role !== "superadmin") return forbidden()

    const { id } = await request.json()
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Missing or invalid id" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Restore: clear entire deletedBy array and reset expiresAt to 48h from now
    await db.collection("notifications").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          deletedBy: [],
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          restoredAt: new Date()
        }
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error restoring notification:", error)
    return NextResponse.json({ success: false, message: "Failed to restore notification" })
  }
}
