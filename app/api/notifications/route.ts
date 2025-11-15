export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('role')

    if (!userId || !userRole) {
      return NextResponse.json({ success: false, message: "Missing parameters" })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get notifications for the user based on their role
    const query = {
      $or: [
        { userId: new ObjectId(userId) }, // Direct user notifications
        { targetRole: userRole }, // Role-based notifications
        { targetRole: "all" }, // All users notifications
        { type: "system" } // System-wide notifications
      ]
    }

    const notifications = await db.collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    const formattedNotifications = notifications.map(n => ({
      _id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority || "normal",
      read: n.read || false,
      createdAt: n.createdAt,
      actionUrl: n.actionUrl || null
    }))

    return NextResponse.json({ 
      success: true, 
      notifications: formattedNotifications 
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch notifications" })
  }
}