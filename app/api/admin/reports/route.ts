export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

const DB = "ntdm_animal_hospital"

// GET: a single consolidated payload backing every card, view dialog, and
// export on the admin Reports & Analytics page. Everything here is computed
// live from the real collections (no stored "report" artifacts / history) -
// the page always reflects current data, so "download" just serializes this
// same response into a file client-side.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const [farmers, doctors, consultations, diseases, ticketDocs] = await Promise.all([
      db.collection("users").find({ role: "farmer" }).toArray(),
      db.collection("users").find({ role: "doctor" }).toArray(),
      db.collection("consultations").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("disease_records").find({}).sort({ diagnosedDate: -1, createdAt: -1 }).toArray(),
      db.collection("supportTickets").find({}).sort({ lastMessageAt: -1 }).toArray(),
    ])

    const farmerMap = new Map(farmers.map((f) => [f._id.toString(), f]))
    const doctorMap = new Map(doctors.map((d) => [d._id.toString(), d]))

    // --- User activity ---
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const allUsers = [...farmers, ...doctors]
    const newThisMonth = allUsers.filter((u) => u.createdAt && new Date(u.createdAt) >= lastMonth).length
    const previousTotal = allUsers.length - newThisMonth
    const growthPercentage = previousTotal > 0 ? Math.round((newThisMonth / previousTotal) * 100) : 0
    const activeFarmers = farmers.filter((f) => f.status === "active").length
    const activeDoctors = doctors.filter((d) => d.status === "active").length

    // --- Consultations / appointments ---
    const statusCounts = { pending: 0, accepted: 0, rejected: 0, completed: 0 }
    const typeCounts: Record<string, number> = { Virtual: 0, "In-Person": 0 }
    let overdueCount = 0
    const now = Date.now()
    const consultationItems = consultations.map((c) => {
      const status = (c.status || "pending").toLowerCase()
      if (status in statusCounts) statusCounts[status as keyof typeof statusCounts]++
      if (c.type) typeCounts[c.type] = (typeCounts[c.type] || 0) + 1
      if (status === "pending" && c.createdAt && now - new Date(c.createdAt).getTime() > 30 * 60 * 1000) overdueCount++

      const doctorId = c.doctor ? c.doctor.toString() : null
      const farmer = c.farmerId ? farmerMap.get(c.farmerId) : null
      return {
        id: c._id.toString(),
        farmerName: farmer?.name || c.fullName || "Unknown",
        district: farmer?.district || null,
        doctorName: (doctorId && doctorMap.get(doctorId)?.name) || "Unassigned",
        service: c.service || null,
        date: c.date || null,
        time: c.time || null,
        type: c.type || null,
        status,
      }
    })

    // --- Disease records ---
    const diseaseStatusCounts: Record<string, number> = { Active: 0, "Under Treatment": 0, Resolved: 0 }
    const diseaseItems = diseases.map((r) => {
      const status = r.status || "Active"
      diseaseStatusCounts[status] = (diseaseStatusCounts[status] || 0) + 1
      const farmer = r.farmerId ? farmerMap.get(r.farmerId) : null
      return {
        id: r._id.toString(),
        farmerName: farmer?.name || "Unknown",
        district: farmer?.district || null,
        diseaseName: r.diseaseName || "Unknown",
        status,
        diagnosedDate: r.diagnosedDate || null,
      }
    })

    // --- Support tickets ---
    const ticketOpen = ticketDocs.filter((t) => t.status !== "resolved").length
    const ticketResolved = ticketDocs.filter((t) => t.status === "resolved").length
    const ticketUnassigned = ticketDocs.filter((t) => !t.assignedTo).length
    const ticketItems = ticketDocs.map((t) => ({
      id: t._id.toString(),
      subject: t.subject,
      requesterName: t.requesterName,
      requesterRole: t.requesterRole,
      status: t.status,
      assignedToName: t.assignedToName || null,
      createdAt: t.createdAt,
    }))

    // --- Regional breakdown ---
    const districtMap = new Map<string, { district: string; farmers: number; doctors: number; consultations: number; diseases: number }>()
    const bump = (district: string | null | undefined, field: "farmers" | "doctors" | "consultations" | "diseases") => {
      const key = district || "Unassigned"
      if (!districtMap.has(key)) districtMap.set(key, { district: key, farmers: 0, doctors: 0, consultations: 0, diseases: 0 })
      districtMap.get(key)![field]++
    }
    farmers.forEach((f) => bump(f.district, "farmers"))
    doctors.forEach((d) => bump(d.district, "doctors"))
    consultations.forEach((c) => {
      const farmer = c.farmerId ? farmerMap.get(c.farmerId) : null
      bump(farmer?.district, "consultations")
    })
    diseases.forEach((r) => {
      const farmer = r.farmerId ? farmerMap.get(r.farmerId) : null
      bump(farmer?.district, "diseases")
    })
    const byDistrict = Array.from(districtMap.values()).sort((a, b) => (b.farmers + b.doctors) - (a.farmers + a.doctors))

    // --- Performance ---
    const completionRate = consultations.length > 0 ? Math.round((statusCounts.completed / consultations.length) * 100) : 0
    const respondedPending = statusCounts.pending
    const responseCompliance = respondedPending > 0 ? Math.round(((respondedPending - overdueCount) / respondedPending) * 100) : 100
    const ticketResolutionRate = ticketDocs.length > 0 ? Math.round((ticketResolved / ticketDocs.length) * 100) : 0

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      stats: {
        totalFarmers: farmers.length,
        totalDoctors: doctors.length,
        activeFarmers,
        activeDoctors,
        newThisMonth,
        growthPercentage,
      },
      consultations: {
        total: consultations.length,
        statusCounts,
        typeCounts,
        overdueCount,
        items: consultationItems,
      },
      diseases: {
        total: diseases.length,
        statusCounts: diseaseStatusCounts,
        items: diseaseItems,
      },
      tickets: {
        total: ticketDocs.length,
        open: ticketOpen,
        resolved: ticketResolved,
        unassigned: ticketUnassigned,
        items: ticketItems,
      },
      performance: {
        completionRate,
        responseCompliance,
        ticketResolutionRate,
      },
      byDistrict,
      users: {
        items: allUsers.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          role: u.role,
          district: u.district || null,
          status: u.status || "active",
          createdAt: u.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error("Error building admin reports data:", error)
    return NextResponse.json({ error: "Failed to build reports" }, { status: 500 })
  }
}
