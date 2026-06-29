"use server"

import clientPromise from "../db"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { hashPassword } from "../password"

interface SystemSettingsDoc {
  _id: string
  siteName: string
  siteEmail: string
  siteDescription: string
  autoApproveUsers: boolean
  requireEmailVerification: boolean
  allowUserDeletion: boolean
  enableTwoFactor: boolean
  sessionTimeout: boolean
  sessionDuration: number
  maxLoginAttempts: number
  maxUsersPerRole: number
  maxConsultationsPerDay: number
  maintenanceMode: boolean
  systemAlerts: boolean
  userRegistrationAlerts: boolean
  suspiciousActivityAlerts: boolean
  backupFrequency: string
  dataRetention: number
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  updatedAt: Date
}

// Get all users for super admin management
export async function getAllUsers() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const users = await db.collection("users").find({}).toArray()

    // Get active sessions to determine online status
    const activeSessions = await db.collection("sessions").find({
      expiresAt: { $gt: new Date() }
    }).toArray()

    const onlineUserIds = new Set(activeSessions.map(session => session.userId.toString()))

    return users.map(user => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status || "active",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt || null,
      isOnline: onlineUserIds.has(user._id.toString()),
      // Include role-specific fields
      district: user.district || null,
      sector: user.sector || null,
      licenseNumber: user.licenseNumber || null,
      specialization: user.specialization || null,
    }))
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

// Update user status (suspend/activate)
export async function updateUserStatus(userId: string, status: "active" | "suspended" | "inactive") {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    )

    if (result.modifiedCount > 0) {
      revalidatePath("/superadmin/users")
      return { success: true, message: `User ${status} successfully` }
    }

    return { success: false, message: "User not found" }
  } catch (error) {
    console.error("Error updating user status:", error)
    return { success: false, message: "Failed to update user status" }
  }
}

// Bulk User Operations
export async function bulkUpdateUserStatus(userIds: string[], status: "active" | "suspended" | "inactive") {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const objectIds = userIds.map(id => new ObjectId(id))
    const result = await db.collection("users").updateMany(
      { _id: { $in: objectIds } },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    )

    revalidatePath("/superadmin/users")
    return { success: true, message: `${result.modifiedCount} users updated successfully`, count: result.modifiedCount }
  } catch (error) {
    console.error("Error bulk updating user status:", error)
    return { success: false, message: "Failed to update users" }
  }
}

export async function bulkDeleteUsers(userIds: string[]) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const objectIds = userIds.map(id => new ObjectId(id))
    const result = await db.collection("users").deleteMany(
      { _id: { $in: objectIds } }
    )

    revalidatePath("/superadmin/users")
    return { success: true, message: `${result.deletedCount} users deleted successfully`, count: result.deletedCount }
  } catch (error) {
    console.error("Error bulk deleting users:", error)
    return { success: false, message: "Failed to delete users" }
  }
}

export async function exportUsers(filters?: {
  role?: string
  status?: string
  dateRange?: { start: Date, end: Date }
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    let query: any = {}
    
    if (filters?.role && filters.role !== 'all') {
      query.role = filters.role
    }
    
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status
    }
    
    if (filters?.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      }
    }

    const users = await db.collection("users").find(query).toArray()
    
    // Format for CSV export
    const csvData = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status || 'active',
      district: user.district || '',
      sector: user.sector || '',
      licenseNumber: user.licenseNumber || '',
      specialization: user.specialization || '',
      createdAt: user.createdAt?.toISOString() || '',
      lastLoginAt: user.lastLoginAt?.toISOString() || ''
    }))

    return { success: true, data: csvData, count: csvData.length }
  } catch (error) {
    console.error("Error exporting users:", error)
    return { success: false, message: "Failed to export users" }
  }
}

export async function importUsers(userData: any[]) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Validate and format user data
    const validUsers = userData.filter(user => 
      user.name && user.email && user.role
    ).map(user => ({
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: user.status || 'active'
    }))

    if (validUsers.length === 0) {
      return { success: false, message: "No valid users to import" }
    }

    const result = await db.collection("users").insertMany(validUsers)
    revalidatePath("/superadmin/users")
    
    return { 
      success: true, 
      message: `${result.insertedCount} users imported successfully`,
      count: result.insertedCount,
      skipped: userData.length - validUsers.length
    }
  } catch (error) {
    console.error("Error importing users:", error)
    return { success: false, message: "Failed to import users" }
  }
}

export async function getUserActivityLogs(userId?: string, limit: number = 100) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    let query: any = {}
    if (userId) {
      query.userId = new ObjectId(userId)
    }

    const logs = await db.collection("user_activity_logs")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return logs.map(log => ({
      _id: log._id.toString(),
      userId: log.userId?.toString(),
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt
    }))
  } catch (error) {
    console.error("Error fetching user activity logs:", error)
    return []
  }
}

export async function logUserActivity(data: {
  userId: string
  action: string
  details?: string
  ipAddress?: string
  userAgent?: string
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const log = {
      userId: new ObjectId(data.userId),
      action: data.action,
      details: data.details || '',
      ipAddress: data.ipAddress || '',
      userAgent: data.userAgent || '',
      createdAt: new Date()
    }

    await db.collection("user_activity_logs").insertOne(log)
    return { success: true }
  } catch (error) {
    console.error("Error logging user activity:", error)
    return { success: false }
  }
}

// Advanced Data Export Capabilities
export async function exportConsultations(filters?: {
  status?: string
  dateRange?: { start: Date, end: Date }
  doctorId?: string
  farmerId?: string
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    let query: any = {}
    
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status
    }
    
    if (filters?.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      }
    }
    
    if (filters?.doctorId) {
      query.doctor = new ObjectId(filters.doctorId)
    }
    
    if (filters?.farmerId) {
      query.farmerId = new ObjectId(filters.farmerId)
    }

    const consultations = await db.collection("consultations").find(query).toArray()
    
    // Get user details for doctors and farmers
    const doctorIds = [...new Set(consultations.map(c => c.doctor).filter(Boolean))]
    const farmerIds = [...new Set(consultations.map(c => c.farmerId).filter(Boolean))]
    
    const [doctors, farmers] = await Promise.all([
      doctorIds.length > 0 ? db.collection("users").find({ _id: { $in: doctorIds } }).toArray() : [],
      farmerIds.length > 0 ? db.collection("users").find({ _id: { $in: farmerIds } }).toArray() : []
    ])
    
    const doctorMap = new Map(doctors.map(d => [d._id.toString(), d.name]))
    const farmerMap = new Map(farmers.map(f => [f._id.toString(), f.name]))
    
    // Format for CSV export
    const csvData = consultations.map(consultation => ({
      id: consultation._id.toString(),
      patientName: consultation.fullName,
      phoneNumber: consultation.phoneNumber,
      service: consultation.service,
      type: consultation.type,
      status: consultation.status,
      date: consultation.date,
      time: consultation.time,
      doctorName: doctorMap.get(consultation.doctor?.toString()) || 'Unassigned',
      farmerName: farmerMap.get(consultation.farmerId?.toString()) || 'Unknown',
      feedback: consultation.feedback || '',
      createdAt: consultation.createdAt?.toISOString() || '',
      updatedAt: consultation.updatedAt?.toISOString() || ''
    }))

    return { success: true, data: csvData, count: csvData.length }
  } catch (error) {
    console.error("Error exporting consultations:", error)
    return { success: false, message: "Failed to export consultations" }
  }
}

export async function exportSystemLogs(filters?: {
  logType?: string
  dateRange?: { start: Date, end: Date }
  userId?: string
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    let query: any = {}
    
    if (filters?.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      }
    }
    
    if (filters?.userId) {
      query.userId = new ObjectId(filters.userId)
    }

    // Get different types of logs
    const [activityLogs, errorLogs, loginAttempts] = await Promise.all([
      db.collection("user_activity_logs").find(query).sort({ createdAt: -1 }).toArray(),
      db.collection("error_logs").find(query).sort({ createdAt: -1 }).toArray(),
      db.collection("login_attempts").find(query).sort({ createdAt: -1 }).toArray()
    ])

    // Combine and format logs
    const allLogs = [
      ...activityLogs.map(log => ({
        id: log._id.toString(),
        type: 'Activity',
        userId: log.userId?.toString() || '',
        action: log.action,
        details: log.details || '',
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || '',
        createdAt: log.createdAt?.toISOString() || ''
      })),
      ...errorLogs.map(log => ({
        id: log._id.toString(),
        type: 'Error',
        userId: log.userId?.toString() || '',
        action: 'System Error',
        details: log.message || '',
        ipAddress: '',
        userAgent: '',
        createdAt: log.createdAt?.toISOString() || ''
      })),
      ...loginAttempts.map(log => ({
        id: log._id.toString(),
        type: 'Login',
        userId: log.userId?.toString() || '',
        action: log.success ? 'Login Success' : 'Login Failed',
        details: log.email || '',
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || '',
        createdAt: log.createdAt?.toISOString() || ''
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { success: true, data: allLogs, count: allLogs.length }
  } catch (error) {
    console.error("Error exporting system logs:", error)
    return { success: false, message: "Failed to export system logs" }
  }
}

export async function exportSystemReport() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get comprehensive system statistics
    const [userStats, consultationStats, systemHealth, recentActivity] = await Promise.all([
      getSystemStats(),
      getAllConsultations(),
      getSystemHealth(),
      getRecentActivities()
    ])

    // Generate report data
    const reportData = {
      generatedAt: now.toISOString(),
      reportPeriod: '30 days',
      summary: {
        totalUsers: userStats.totalUsers,
        totalConsultations: userStats.totalConsultations,
        systemStatus: systemHealth.overall.status,
        activeUsers: userStats.userStats
      },
      userMetrics: {
        newUsersLast30Days: await db.collection("users").countDocuments({ createdAt: { $gte: last30Days } }),
        newUsersLast7Days: await db.collection("users").countDocuments({ createdAt: { $gte: last7Days } }),
        activeUsers: await db.collection("sessions").countDocuments({ expiresAt: { $gt: now } }),
        usersByRole: userStats.userStats
      },
      consultationMetrics: {
        totalConsultations: consultationStats.length,
        consultationsLast30Days: consultationStats.filter(c => new Date(c.createdAt) >= last30Days).length,
        consultationsLast7Days: consultationStats.filter(c => new Date(c.createdAt) >= last7Days).length,
        consultationsByStatus: consultationStats.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      },
      systemHealth: {
        database: systemHealth.database,
        security: systemHealth.security,
        performance: systemHealth.performance
      },
      recentActivity: recentActivity.slice(0, 10)
    }

    return { success: true, data: reportData }
  } catch (error) {
    console.error("Error generating system report:", error)
    return { success: false, message: "Failed to generate system report" }
  }
}

export async function scheduleDataExport(data: {
  exportType: 'users' | 'consultations' | 'logs' | 'system_report'
  frequency: 'daily' | 'weekly' | 'monthly'
  filters?: any
  email?: string
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const scheduledExport = {
      ...data,
      status: 'active',
      nextRun: getNextRunDate(data.frequency),
      createdAt: new Date()
    }

    const result = await db.collection("scheduled_exports").insertOne(scheduledExport)
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error("Error scheduling data export:", error)
    return { success: false, message: "Failed to schedule export" }
  }
}

function getNextRunDate(frequency: string): Date {
  const now = new Date()
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'monthly':
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

// Update user information
export async function updateUser(userId: string, formData: FormData) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const updateData = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      role: formData.get("role"),
      updatedAt: new Date()
    }

    // Add password if provided
    // const newPassword = formData.get("password")
    // if (newPassword && newPassword.toString().trim() !== "") {
    //   updateData.password = newPassword.toString()
    // }

    // Add role-specific fields
    if (updateData.role === "farmer") {
      Object.assign(updateData, {
        district: formData.get("district"),
        sector: formData.get("sector"),
      })
    } else if (updateData.role === "doctor") {
      Object.assign(updateData, {
        licenseNumber: formData.get("licenseNumber"),
        specialization: formData.get("specialization"),
      })
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    )

    if (result.modifiedCount > 0) {
      revalidatePath("/superadmin/users")
      return { success: true, message: "User updated successfully" }
    }

    return { success: false, message: "User not found" }
  } catch (error) {
    console.error("Error updating user:", error)
    return { success: false, message: "Failed to update user" }
  }
}

// Update user password
export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: await hashPassword(newPassword),
          updatedAt: new Date()
        }
      }
    )

    if (result.modifiedCount > 0) {
      revalidatePath("/superadmin/users")
      return { success: true, message: "Password updated successfully" }
    }

    return { success: false, message: "User not found" }
  } catch (error) {
    console.error("Error updating password:", error)
    return { success: false, message: "Failed to update password" }
  }
}

// Delete user
export async function deleteUser(userId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection("users").deleteOne(
      { _id: new ObjectId(userId) }
    )

    if (result.deletedCount > 0) {
      revalidatePath("/superadmin/users")
      return { success: true, message: "User deleted successfully" }
    }

    return { success: false, message: "User not found" }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, message: "Failed to delete user" }
  }
}
function safeObjectId(id: any): ObjectId | null {
  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    return null
  }
  return new ObjectId(id)
}
// Get all consultations for super admin review
export async function getAllConsultations() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const consultations = await db.collection("consultations").find({}).sort({ createdAt: -1 }).toArray()

    // Get all unique doctor IDs and farmer IDs from consultations - with validation
    const doctorIds = [...new Set(consultations.map((c) => c.doctor).filter(id => id && ObjectId.isValid(id)))]
    const farmerIds = [...new Set(consultations.map((c) => c.farmerId).filter(id => id && ObjectId.isValid(id)))]

    // Fetch doctor and farmer information - now safe to convert
    const [doctors, farmers] = await Promise.all([
      doctorIds.length > 0 ? db.collection("users").find({
        _id: { $in: doctorIds.map((id) => new ObjectId(id)) },
        role: "doctor",
      }).toArray() : [],
      farmerIds.length > 0 ? db.collection("users").find({
        _id: { $in: farmerIds.map((id) => new ObjectId(id)) },
        role: "farmer",
      }).toArray() : []
    ])

    // Create maps for quick lookup
    const doctorMap = new Map()
    doctors.forEach((doctor) => {
      doctorMap.set(doctor._id.toString(), doctor.name)
    })

    const farmerMap = new Map()
    farmers.forEach((farmer) => {
      farmerMap.set(farmer._id.toString(), farmer.name)
    })

    return consultations.map((c) => ({
      _id: c._id.toString(),
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      service: c.service,
      date: c.date,
      time: c.time,
      type: c.type,
      status: c.status.toLowerCase(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt?.toISOString() || null,
      doctor: doctorMap.get(c.doctor) || c.doctor || "Unassigned",
      farmer: farmerMap.get(c.farmerId) || "Unknown Farmer",
      farmerId: c.farmerId || null,
      feedback: c.feedback || null,
    }))
  } catch (error) {
    console.error("Error fetching consultations:", error)
    return []
  }
}

// Get recent activities for dashboard
export async function getRecentActivities() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get recent users (last 24 hours)
    const recentUsers = await db.collection("users")
      .find({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      .sort({ createdAt: -1 })
      .limit(2)
      .toArray()

    // Get recent consultations (last 24 hours)
    const recentConsultations = await db.collection("consultations")
      .find({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      .sort({ createdAt: -1 })
      .limit(2)
      .toArray()

    const activities: { id: string; type: string; message: string; time: string; createdAt: Date }[] = []

    // Add user activities
    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user._id}`,
        type: 'user',
        message: `New ${user.role} registered: ${user.name}`,
        time: getTimeAgo(user.createdAt),
        createdAt: user.createdAt
      })
    })

    // Add consultation activities
    recentConsultations.forEach(consultation => {
      activities.push({
        id: `consultation-${consultation._id}`,
        type: 'consultation',
        message: `New consultation request: ${consultation.service}`,
        time: getTimeAgo(consultation.createdAt),
        createdAt: consultation.createdAt
      })
    })

    // Sort by creation time and return top 4
    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)

  } catch (error) {
    console.error("Error fetching recent activities:", error)
    return []
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
}

// Get analytics data for dashboard
export async function getAnalyticsData() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // User analytics
    const [totalUsers, newUsersLast30Days, newUsersLast7Days, activeUsers] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({ createdAt: { $gte: last30Days } }),
      db.collection("users").countDocuments({ createdAt: { $gte: last7Days } }),
      db.collection("sessions").countDocuments({ expiresAt: { $gt: now } })
    ])

    // Consultation analytics
    const [totalConsultations, consultationsLast30Days, pendingConsultations, completedConsultations] = await Promise.all([
      db.collection("consultations").countDocuments(),
      db.collection("consultations").countDocuments({ createdAt: { $gte: last30Days } }),
      db.collection("consultations").countDocuments({ status: "pending" }),
      db.collection("consultations").countDocuments({ status: "completed" })
    ])

    // User registration trends (last 7 days)
    const registrationTrends = await db.collection("users").aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray()

    // Consultation trends (last 7 days)
    const consultationTrends = await db.collection("consultations").aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray()

    // User role distribution
    const userRoleDistribution = await db.collection("users").aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    // Popular services
    const popularServices = await db.collection("consultations").aggregate([
      {
        $group: {
          _id: "$service",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray()

    return {
      users: {
        total: totalUsers,
        newLast30Days: newUsersLast30Days,
        newLast7Days: newUsersLast7Days,
        active: activeUsers,
        growthRate: totalUsers > 0 ? ((newUsersLast30Days / totalUsers) * 100).toFixed(1) : 0
      },
      consultations: {
        total: totalConsultations,
        last30Days: consultationsLast30Days,
        pending: pendingConsultations,
        completed: completedConsultations,
        completionRate: totalConsultations > 0 ? ((completedConsultations / totalConsultations) * 100).toFixed(1) : 0
      },
      trends: {
        registrations: registrationTrends,
        consultations: consultationTrends
      },
      distribution: {
        userRoles: userRoleDistribution,
        popularServices: popularServices
      }
    }
  } catch (error) {
    console.error("Error fetching analytics data:", error)
    return null
  }
}

// Get system health metrics
export async function getSystemHealth() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Database health
    const dbStats = await db.stats()
    
    // Error monitoring (last 24 hours)
    const errorCount = await db.collection("error_logs").countDocuments({
      createdAt: { $gte: last24Hours }
    })

    // Failed login attempts (last 24 hours)
    const failedLogins = await db.collection("login_attempts").countDocuments({
      success: false,
      createdAt: { $gte: last24Hours }
    })

    // Active sessions
    const activeSessions = await db.collection("sessions").countDocuments({
      expiresAt: { $gt: now }
    })

    // System uptime (mock - in real system would be actual uptime)
    const uptime = process.uptime()
    const uptimeHours = Math.floor(uptime / 3600)
    const uptimeMinutes = Math.floor((uptime % 3600) / 60)

    return {
      database: {
        status: "healthy",
        size: Math.round(dbStats.dataSize / (1024 * 1024)), // MB
        collections: dbStats.collections,
        indexes: dbStats.indexes
      },
      security: {
        failedLogins,
        activeSessions,
        status: failedLogins > 50 ? "warning" : "healthy"
      },
      performance: {
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        errors24h: errorCount,
        status: errorCount > 10 ? "warning" : "healthy"
      },
      overall: {
        status: (failedLogins > 50 || errorCount > 10) ? "warning" : "healthy"
      }
    }
  } catch (error) {
    console.error("Error fetching system health:", error)
    return {
      database: { status: "error" },
      security: { status: "error" },
      performance: { status: "error" },
      overall: { status: "error" }
    }
  }
}

// Log system errors
export async function logSystemError(error: {
  message: string
  stack?: string
  userId?: string
  action?: string
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("error_logs").insertOne({
      ...error,
      createdAt: new Date(),
      resolved: false
    })
  } catch (err) {
    console.error("Failed to log system error:", err)
  }
}

// Content Management Functions
export async function getSystemAnnouncements() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const announcements = await db.collection("announcements")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return announcements.map(a => ({
      _id: a._id.toString(),
      title: a.title,
      content: a.content,
      type: a.type || "general",
      priority: a.priority || "normal",
      active: a.active || false,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }))
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return []
  }
}

export async function createAnnouncement(data: {
  title: string
  content: string
  type: "general" | "maintenance" | "feature" | "security"
  priority: "low" | "normal" | "high" | "critical"
  active: boolean
  sendEmail?: boolean
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const announcement = {
      title: data.title,
      content: data.content,
      type: data.type,
      priority: data.priority,
      active: data.active,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection("announcements").insertOne(announcement)
    
    // Send email notifications if requested
    if (data.sendEmail) {
      try {
        const { sendAnnouncementEmail } = await import('../email.js')
        
        // Get all active users with valid emails
        const users = await db.collection("users").find({
          status: { $ne: "suspended" },
          email: { $exists: true, $ne: "" }
        }).toArray()

        console.log(`Found ${users.length} users to send announcement emails to`)
        
        if (users.length > 0) {
          // Send emails in batches to avoid overwhelming the email service
          const batchSize = 5
          let successCount = 0
          let failCount = 0
          
          for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize)
            console.log(`Sending batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(users.length/batchSize)} (${batch.length} emails)`)
            
            const emailPromises = batch.map(async (user) => {
              try {
                const result = await sendAnnouncementEmail(user.email, user.name, announcement)
                if (result.success) {
                  successCount++
                  console.log(`✓ Email sent to ${user.email}`)
                } else {
                  failCount++
                  console.log(`✗ Failed to send email to ${user.email}: ${result.error}`)
                }
                return result
              } catch (error) {
                failCount++
                console.log(`✗ Error sending email to ${user.email}:`, error)
                return { success: false, error: error instanceof Error ? error.message : String(error) }
              }
            })
            
            await Promise.allSettled(emailPromises)
            
            // Small delay between batches
            if (i + batchSize < users.length) {
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          }
          
          console.log(`Email summary: ${successCount} sent, ${failCount} failed out of ${users.length} total`)
        } else {
          console.log('No users found to send emails to')
        }
      } catch (emailError) {
        console.error("Error in email sending process:", emailError)
        // Don't fail the announcement creation if email fails
      }
    }

    revalidatePath("/superadmin/content")
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error("Error creating announcement:", error)
    return { success: false, message: "Failed to create announcement" }
  }
}

export async function updateAnnouncement(id: string, data: {
  title: string
  content: string
  type: string
  priority: string
  active: boolean
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("announcements").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...data,
          updatedAt: new Date()
        }
      }
    )

    revalidatePath("/superadmin/content")
    return { success: true }
  } catch (error) {
    console.error("Error updating announcement:", error)
    return { success: false, message: "Failed to update announcement" }
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("announcements").deleteOne({ _id: new ObjectId(id) })
    revalidatePath("/superadmin/content")
    return { success: true }
  } catch (error) {
    console.error("Error deleting announcement:", error)
    return { success: false, message: "Failed to delete announcement" }
  }
}

// Generate automatic notifications based on system events
export async function generateSystemNotifications() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Check for new user registrations
    const newUsers = await db.collection("users")
      .countDocuments({ createdAt: { $gte: last24Hours } })

    // Check for pending consultations
    const pendingConsultations = await db.collection("consultations")
      .countDocuments({ status: "pending" })

    // Check for system issues (failed logins, etc.)
    const failedLogins = await db.collection("login_attempts")
      .countDocuments({ 
        success: false, 
        createdAt: { $gte: last24Hours } 
      })

    const notifications = []

    if (newUsers > 5) {
      notifications.push({
        title: "High User Registration Activity",
        message: `${newUsers} new users registered in the last 24 hours`,
        type: "system",
        priority: "normal",
        role: "superadmin"
      })
    }

    if (pendingConsultations > 10) {
      notifications.push({
        title: "High Pending Consultations",
        message: `${pendingConsultations} consultations are pending review`,
        type: "system",
        priority: "high",
        role: "superadmin",
        actionUrl: "/superadmin/consultations"
      })
    }

    if (failedLogins > 20) {
      notifications.push({
        title: "Security Alert",
        message: `${failedLogins} failed login attempts detected in the last 24 hours`,
        type: "security",
        priority: "critical",
        role: "superadmin"
      })
    }

    // Insert notifications — only if not already created today
    if (notifications.length > 0) {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)

      const notificationsWithTimestamp = await Promise.all(
        notifications.map(async n => {
          const existing = await db.collection("notifications").findOne({
            title: n.title,
            createdAt: { $gte: startOfDay }
          })
          return existing ? null : { ...n, read: false, deletedBy: [], expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), createdAt: new Date() }
        })
      )

      const toInsert = notificationsWithTimestamp.filter(
        (n): n is NonNullable<typeof n> => n !== null
      )
      if (toInsert.length > 0) {
        await db.collection("notifications").insertMany(toInsert)
      }
    }

    return { success: true, count: notifications.length }
  } catch (error) {
    console.error("Error generating system notifications:", error)
    return { success: false, count: 0 }
  }
}

// Get system settings
export async function getSystemSettings() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const settings = await db.collection<SystemSettingsDoc>("system_settings").findOne({ _id: "global" })
    
    // Return default settings if none exist
    if (!settings) {
      const defaultSettings = {
        _id: "global",
        siteName: "NTDM Animal Hospital",
        siteEmail: "admin@ntdm.com",
        siteDescription: "Professional veterinary services for animal health and care",
        autoApproveUsers: true,
        requireEmailVerification: true,
        allowUserDeletion: true,
        enableTwoFactor: false,
        sessionTimeout: true,
        sessionDuration: 8,
        maxLoginAttempts: 5,
        maxUsersPerRole: 1000,
        maxConsultationsPerDay: 500,
        maintenanceMode: false,
        systemAlerts: true,
        userRegistrationAlerts: true,
        suspiciousActivityAlerts: true,
        backupFrequency: "daily",
        dataRetention: 365,
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpUser: "",
        smtpPass: "",
        smtpSecure: true,
        updatedAt: new Date()
      }
      
      await db.collection<SystemSettingsDoc>("system_settings").insertOne(defaultSettings)
      return defaultSettings
    }
    
    return settings
  } catch (error) {
    console.error("Error fetching system settings:", error)
    return null
  }
}

// Update system settings
export async function updateSystemSettings(settings: any) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection<SystemSettingsDoc>("system_settings").updateOne(
      { _id: "global" },
      {
        $set: {
          ...settings,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    return { success: true, message: "Settings updated successfully" }
  } catch (error) {
    console.error("Error updating system settings:", error)
    return { success: false, message: "Failed to update settings" }
  }
}

// Database maintenance actions
export async function performDatabaseAction(action: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    switch (action) {
      case "backup":
        // In a real implementation, this would trigger a backup process
        console.log("Database backup initiated")
        return { success: true, message: "Backup initiated successfully" }
      
      case "optimize":
        // Optimize collections
        const collections = await db.listCollections().toArray()
        for (const collection of collections) {
          await db.collection(collection.name).createIndex({ createdAt: 1 })
        }
        return { success: true, message: "Database optimized successfully" }
      
      case "clearCache":
        // Clear any cached data
        await db.collection("cache").deleteMany({})
        return { success: true, message: "Cache cleared successfully" }
      
      default:
        return { success: false, message: "Unknown action" }
    }
  } catch (error) {
    console.error(`Error performing database action ${action}:`, error)
    return { success: false, message: `Failed to perform ${action}` }
  }
}

// Get system statistics
export async function getSystemStats() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const [userStats, consultationStats] = await Promise.all([
      db.collection("users").aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      db.collection("consultations").aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]).toArray()
    ])

    const totalUsers = userStats.reduce((sum, stat) => sum + stat.count, 0)
    const totalConsultations = consultationStats.reduce((sum, stat) => sum + stat.count, 0)

    return {
      totalUsers,
      totalConsultations,
      userStats: userStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count
        return acc
      }, {} as Record<string, number>),
      consultationStats: consultationStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count
        return acc
      }, {} as Record<string, number>)
    }
  } catch (error) {
    console.error("Error fetching system stats:", error)
    return {
      totalUsers: 0,
      totalConsultations: 0,
      userStats: {},
      consultationStats: {}
    }
  }
}

// Get user profile by ID
export async function getUserProfile(userId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      return null
    }

    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      bio: user.bio || "",
      location: user.location || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

// Update user profile
export async function updateUserProfile(userId: string, profileData: {
  name: string
  email: string
  phone: string
  bio: string
  location: string
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: {
          ...profileData,
          updatedAt: new Date()
        }
      }
    )

    if (result.modifiedCount > 0) {
      revalidatePath("/superadmin/profile")
      return { success: true, message: "Profile updated successfully" }
    }

    return { success: false, message: "No changes made" }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { success: false, message: "Failed to update profile" }
  }
}

// Get notifications for super admin
export async function getNotifications(userId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get system notifications and user-specific notifications
    const notifications = await db.collection("notifications")
      .find({
        $or: [
          { userId: new ObjectId(userId) },
          { type: "system" },
          { role: "superadmin" }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    return notifications.map(n => ({
      _id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority || "normal",
      read: n.read || false,
      createdAt: n.createdAt,
      actionUrl: n.actionUrl || null
    }))
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return []
  }
}

// Mark notification as read
export async function markNotificationRead(notificationId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("notifications").updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { read: true, readAt: new Date() } }
    )

    return { success: true }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { success: false }
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsRead(userId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("notifications").updateMany(
      { 
        $or: [
          { userId: new ObjectId(userId) },
          { type: "system" },
          { role: "superadmin" }
        ],
        read: false
      },
      { $set: { read: true, readAt: new Date() } }
    )

    return { success: true }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return { success: false }
  }
}

// Create system notification
export async function createSystemNotification(data: {
  title: string
  message: string
  type: "system" | "user" | "security" | "maintenance"
  priority?: "low" | "normal" | "high" | "critical"
  role?: string
  actionUrl?: string
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const notification = {
      ...data,
      priority: data.priority || "normal",
      read: false,
      deletedBy: [],
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdAt: new Date()
    }

    await db.collection("notifications").insertOne(notification)
    return { success: true }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false }
  }
}

// Advanced Notification System
export async function getNotificationTemplates() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const templates = await db.collection("notification_templates")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return templates.map(t => ({
      _id: t._id.toString(),
      name: t.name,
      title: t.title,
      message: t.message,
      type: t.type,
      priority: t.priority,
      targetRole: t.targetRole,
      active: t.active,
      createdAt: t.createdAt
    }))
  } catch (error) {
    console.error("Error fetching notification templates:", error)
    return []
  }
}

export async function createNotificationTemplate(data: {
  name: string
  title: string
  message: string
  type: string
  priority: string
  targetRole: string
  active: boolean
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const template = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection("notification_templates").insertOne(template)
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error("Error creating notification template:", error)
    return { success: false, message: "Failed to create template" }
  }
}

export async function sendBulkNotification(templateId: string, targetUsers: string[]) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get template
    const template = await db.collection("notification_templates")
      .findOne({ _id: new ObjectId(templateId) })

    if (!template) {
      return { success: false, message: "Template not found" }
    }

    // Create notifications for each target user (don't include targetRole to avoid role-based broadcasting)
    const notifications = targetUsers.map(userId => ({
      userId: new ObjectId(userId),
      title: template.title,
      message: template.message,
      type: template.type,
      priority: template.priority,
      read: false,
      deletedBy: [],
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdAt: new Date()
    }))

    await db.collection("notifications").insertMany(notifications)
    return { success: true, count: notifications.length }
  } catch (error) {
    console.error("Error sending bulk notification:", error)
    return { success: false, message: "Failed to send notifications" }
  }
}

export async function scheduleNotification(data: {
  templateId: string
  targetUsers: string[]
  scheduledFor: Date
  recurring?: "daily" | "weekly" | "monthly"
}) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const scheduledNotification = {
      ...data,
      status: "pending",
      createdAt: new Date()
    }

    const result = await db.collection("scheduled_notifications").insertOne(scheduledNotification)
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error("Error scheduling notification:", error)
    return { success: false, message: "Failed to schedule notification" }
  }
}

export async function getScheduledNotifications() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const scheduled = await db.collection("scheduled_notifications")
      .find({ status: "pending" })
      .sort({ scheduledFor: 1 })
      .toArray()

    return scheduled.map(s => ({
      _id: s._id.toString(),
      templateId: s.templateId,
      targetUsers: s.targetUsers,
      scheduledFor: s.scheduledFor,
      recurring: s.recurring,
      status: s.status,
      createdAt: s.createdAt
    }))
  } catch (error) {
    console.error("Error fetching scheduled notifications:", error)
    return []
  }
}

export async function deleteNotificationTemplate(templateId: string) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection("notification_templates")
      .deleteOne({ _id: new ObjectId(templateId) })

    if (result.deletedCount > 0) {
      return { success: true, message: "Template deleted successfully" }
    }

    return { success: false, message: "Template not found" }
  } catch (error) {
    console.error("Error deleting notification template:", error)
    return { success: false, message: "Failed to delete template" }
  }
}
