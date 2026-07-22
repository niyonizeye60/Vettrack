export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/actions/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Store read notification in admin_read_notifications collection
    await db.collection("admin_read_notifications").updateOne(
      { 
        userId: new ObjectId(currentUser._id),
        notificationId: notificationId
      },
      { 
        $set: {
          userId: new ObjectId(currentUser._id),
          notificationId: notificationId,
          readAt: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({ 
      success: true,
      message: "Notification marked as read"
    })

  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Failed to mark notification as read" 
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get all current admin notifications to mark them as read
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const [unavailableDoctors, newUsers, recentConsultations, slowConsultations] = await Promise.all([
      db.collection("users").find({ role: "doctor", status: "unavailable", district: currentUser.district }).toArray(),
      db.collection("users").find({ district: currentUser.district, createdAt: { $gte: yesterday }, role: { $in: ["farmer", "doctor"] } }).toArray(),
      db.collection("consultations").find({ updatedAt: { $gte: yesterday }, status: { $in: ["accepted", "rejected", "completed"] } }).toArray(),
      db.collection("consultations").find({ status: "pending", createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } }).toArray()
    ])

    // Generate notification IDs for all current notifications
    const notificationIds = []
    
    unavailableDoctors.forEach(doctor => {
      notificationIds.push(`doctor_unavailable_${doctor._id}`)
    })
    
    newUsers.forEach(user => {
      notificationIds.push(`new_user_${user._id}`)
    })
    
    recentConsultations.forEach(consultation => {
      notificationIds.push(`consultation_status_${consultation._id}`)
    })
    
    slowConsultations.forEach(consultation => {
      notificationIds.push(`response_time_${consultation._id}`)
    })

    // Add daily summary notification ID
    notificationIds.push(`daily_summary_${today.toDateString()}`)

    // Mark all as read
    const bulkOps = notificationIds.map(notificationId => ({
      updateOne: {
        filter: { 
          userId: new ObjectId(currentUser._id),
          notificationId: notificationId
        },
        update: { 
          $set: {
            userId: new ObjectId(currentUser._id),
            notificationId: notificationId,
            readAt: new Date()
          }
        },
        upsert: true
      }
    }))

    if (bulkOps.length > 0) {
      await db.collection("admin_read_notifications").bulkWrite(bulkOps)
    }

    return NextResponse.json({ 
      success: true,
      message: "All notifications marked as read"
    })

  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Failed to mark all notifications as read" 
    }, { status: 500 })
  }
}