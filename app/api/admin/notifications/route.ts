export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/actions/auth"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const notifications = []

    // Get read notifications for this admin
    const readNotifications = await db.collection("admin_read_notifications").find({
      userId: new ObjectId(currentUser._id)
    }).toArray()
    const readNotificationIds = new Set(readNotifications.map(r => r.notificationId))

    // Doctor Unavailability Notifications
    const unavailableDoctors = await db.collection("users").find({
      role: "doctor",
      status: "unavailable",
      district: currentUser.district
    }).toArray()

    for (const doctor of unavailableDoctors) {
      const notificationId = `doctor_unavailable_${doctor._id}`
      notifications.push({
        id: notificationId,
        type: 'doctor_unavailable',
        title: 'Doctor Unavailable',
        message: `Dr. ${doctor.name} marked unavailable`,
        time: new Date(doctor.updatedAt || doctor.createdAt).toLocaleString(),
        read: readNotificationIds.has(notificationId),
        createdAt: doctor.updatedAt || doctor.createdAt
      })
    }

    // New User Registrations (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const newUsers = await db.collection("users").find({
      district: currentUser.district,
      createdAt: { $gte: yesterday },
      role: { $in: ["farmer", "doctor"] }
    }).sort({ createdAt: -1 }).toArray()

    for (const user of newUsers) {
      const notificationId = `new_user_${user._id}`
      notifications.push({
        id: notificationId,
        type: 'new_user',
        title: 'New User Registration',
        message: `${user.role === 'farmer' ? 'Farmer' : 'Doctor'} ${user.name} registered`,
        time: new Date(user.createdAt).toLocaleString(),
        read: readNotificationIds.has(notificationId),
        createdAt: user.createdAt
      })
    }

    // Consultation Status Changes (last 24 hours)
    const recentConsultations = await db.collection("consultations").find({
      updatedAt: { $gte: yesterday },
      status: { $in: ["accepted", "rejected", "completed"] }
    }).sort({ updatedAt: -1 }).limit(10).toArray()

    for (const consultation of recentConsultations) {
      const doctor = await db.collection("users").findOne({ _id: new ObjectId(consultation.doctorId) })
      const notificationId = `consultation_status_${consultation._id}`
      notifications.push({
        id: notificationId,
        type: 'consultation_status',
        title: `Consultation ${consultation.status}`,
        message: `Dr. ${doctor?.name || 'Unknown'} ${consultation.status} consultation`,
        time: new Date(consultation.updatedAt).toLocaleString(),
        read: readNotificationIds.has(notificationId),
        createdAt: consultation.updatedAt
      })
    }

    // Response Time Alerts (consultations taking > 30 minutes)
    const slowConsultations = await db.collection("consultations").find({
      status: "pending",
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }
    }).toArray()

    for (const consultation of slowConsultations) {
      const doctor = await db.collection("users").findOne({ _id: new ObjectId(consultation.doctorId) })
      const timeDiff = Math.floor((Date.now() - new Date(consultation.createdAt).getTime()) / (1000 * 60))
      const notificationId = `response_time_${consultation._id}`
      notifications.push({
        id: notificationId,
        type: 'response_time',
        title: 'Response Time Alert',
        message: `Dr. ${doctor?.name || 'Unknown'} exceeded 30-min target (${timeDiff} min)`,
        time: new Date(consultation.createdAt).toLocaleString(),
        read: readNotificationIds.has(notificationId),
        createdAt: consultation.createdAt
      })
    }

    // Daily Performance Summary
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayConsultations = await db.collection("consultations").countDocuments({
      createdAt: { $gte: today }
    })
    
    const completedToday = await db.collection("consultations").countDocuments({
      createdAt: { $gte: today },
      status: "completed"
    })

    const completionRate = todayConsultations > 0 ? Math.round((completedToday / todayConsultations) * 100) : 0

    if (completionRate < 90) {
      const notificationId = `daily_summary_${today.toDateString()}`
      notifications.push({
        id: notificationId,
        type: 'daily_summary',
        title: 'Daily Performance Report',
        message: `${completionRate}% consultation completion rate (Target: 90%)`,
        time: new Date().toLocaleString(),
        read: readNotificationIds.has(notificationId),
        createdAt: new Date()
      })
    }

    // Sort by creation date (newest first) and limit to 20
    const sortedNotifications = notifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)

    return NextResponse.json({ 
      success: true,
      notifications: sortedNotifications 
    })

  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Failed to fetch notifications" 
    }, { status: 500 })
  }
}