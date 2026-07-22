export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    
    // Get user counts (admin can only see farmers and doctors)
    const totalUsers = await db.collection("users").countDocuments({
      role: { $in: ["farmer", "doctor"] }
    })
    
    const activeUsers = await db.collection("users").countDocuments({
      role: { $in: ["farmer", "doctor"] },
      status: "active"
    })

    // Get recent users for growth calculation
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const newUsersThisMonth = await db.collection("users").countDocuments({
      role: { $in: ["farmer", "doctor"] },
      createdAt: { $gte: lastMonth }
    })

    // Calculate growth percentage
    const previousTotal = totalUsers - newUsersThisMonth
    const growthPercentage = previousTotal > 0 ? Math.round((newUsersThisMonth / previousTotal) * 100) : 0

    // Get recent registrations for alerts
    const recentUsers = await db.collection("users").find({
      role: { $in: ["farmer", "doctor"] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(5).toArray()

    const [consultations, openTickets, totalTickets, contentItems] = await Promise.all([
      db.collection("consultations").find({}, { projection: { status: 1, createdAt: 1, updatedAt: 1 } }).toArray(),
      db.collection("supportTickets").countDocuments({ status: { $ne: "resolved" } }),
      db.collection("supportTickets").countDocuments({}),
      db.collection("services").countDocuments({}),
    ])

    const consultationsTotal = consultations.length
    const consultationsCompleted = consultations.filter((c) => (c.status || "").toLowerCase() === "completed").length
    const resolutionRate = consultationsTotal > 0 ? Math.round((consultationsCompleted / consultationsTotal) * 100) : 0

    // "Resolved" here means the vet actually acted on it (not left pending) - used for the average response time below.
    const respondedConsultations = consultations.filter((c) => (c.status || "").toLowerCase() !== "pending" && c.updatedAt)
    const avgResponseMinutes = respondedConsultations.length > 0
      ? respondedConsultations.reduce((sum, c) => sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()), 0)
        / respondedConsultations.length / 60000
      : 0

    // No survey/rating system exists yet, so this is approximated from the
    // one real satisfaction proxy on hand: how much of the support queue is
    // actually getting resolved rather than piling up unanswered.
    const ticketResolutionRate = totalTickets > 0 ? Math.round(((totalTickets - openTickets) / totalTickets) * 100) : 100

    const dashboardData = {
      stats: {
        totalUsers,
        activeUsers,
        growthPercentage,
        consultations: consultationsTotal,
        supportTickets: openTickets,
        contentItems
      },
      recentAlerts: recentUsers.map(user => ({
        id: user._id.toString(),
        type: "new_registration",
        title: `New ${user.role} registration`,
        description: `${user.name} - ${new Date(user.createdAt).toLocaleString()}`,
        priority: "info",
        createdAt: user.createdAt
      })),
      performance: {
        userSatisfaction: ticketResolutionRate,
        responseTime: avgResponseMinutes > 0 ? `${avgResponseMinutes.toFixed(1)} min` : "N/A",
        resolutionRate
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}