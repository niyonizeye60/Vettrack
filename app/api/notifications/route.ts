export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('role')
    const superadmin = searchParams.get('superadmin')

    if (!userId || !userRole) {
      return NextResponse.json({ success: false, message: "Missing parameters" })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const now = new Date()

    // Superadmin: fetch ALL notifications without any filters
    if (superadmin === 'true') {
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

    // Regular users: build query with expiry and soft-delete filters
    let userObjectId: ObjectId | null = null
    try { userObjectId = new ObjectId(userId) } catch {}

    const orConditions: any[] = [
      { targetRole: userRole },
      { targetRole: "all" },
    ]
    if (userObjectId) orConditions.push({ userId: userObjectId })

    const query: any = {
      $and: [
        { $or: orConditions },
        { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }] },
        { $or: [{ deletedBy: { $exists: false } }, { deletedBy: { $not: { $elemMatch: { $eq: userId } } } }] }
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
        read: n.read || false,
        createdAt: n.createdAt,
        expiresAt: n.expiresAt || null,
        deletedBy: n.deletedBy || [],
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')
    const permanent = searchParams.get('permanent') === 'true'

    if (!id) return NextResponse.json({ success: false, message: "Missing id" })

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    if (permanent) {
      // Superadmin permanent delete
      await db.collection("notifications").deleteOne({ _id: new ObjectId(id) })
    } else {
      // Farmer soft delete — add userId to deletedBy array
      await db.collection("notifications").updateOne(
        { _id: new ObjectId(id) },
        { $addToSet: { deletedBy: userId } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ success: false, message: "Failed to delete notification" })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ success: false, message: "Missing id" })

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