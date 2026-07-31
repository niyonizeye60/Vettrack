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

    // Get pending doctor/farmer verifications for the approvals queue (oldest waiting first)
    const pendingApprovalsCount = await db.collection("users").countDocuments({
      role: { $in: ["farmer", "doctor"] },
      status: "pending_verification"
    })

    const pendingApprovalUsers = await db.collection("users").find({
      role: { $in: ["farmer", "doctor"] },
      status: "pending_verification"
    }).sort({ createdAt: 1 }).limit(5).toArray()

    const [consultations, openTickets, contentItems] = await Promise.all([
      db.collection("consultations").countDocuments({}),
      db.collection("supportTickets").countDocuments({ status: { $ne: "resolved" } }),
      db.collection("services").countDocuments({}),
    ])

    const dashboardData = {
      stats: {
        totalUsers,
        activeUsers,
        growthPercentage,
        consultations,
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
      pendingApprovals: {
        count: pendingApprovalsCount,
        users: pendingApprovalUsers.map(user => ({
          id: user._id.toString(),
          name: user.name,
          role: user.role,
          specialization: user.specialization || null,
          createdAt: user.createdAt
        }))
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}