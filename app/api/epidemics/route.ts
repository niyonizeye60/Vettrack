export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"

import { EPIDEMIC_STATUSES, EPIDEMIC_SEVERITIES, type EpidemicCase } from "@/lib/epidemics"
import { ensureEpidemicDisease } from "@/lib/epidemic-diseases"
import { ensureEpidemicAnimalType } from "@/lib/epidemic-animal-types"

const DB = "ntdm_animal_hospital"

function isStaff(role?: string) {
  return ["admin", "doctor", "superadmin"].includes(role || "")
}

// Only admins (and superadmins) may approve / change the status of cases.
// Vets and farmers can view and report, but cannot confirm, resolve or reject.
function canApprove(role?: string) {
  return role === "admin" || role === "superadmin"
}

function toClientCase(doc: any): EpidemicCase {
  return {
    _id: doc._id.toString(),
    farmerId: doc.farmerId,
    farmerName: doc.farmerName || null,
    animalId: doc.animalId || null,
    animalName: doc.animalName || null,
    animalType: doc.animalType || null,
    diseaseName: doc.diseaseName,
    symptoms: doc.symptoms || null,
    affectedCount: doc.affectedCount || 1,
    severity: doc.severity || "medium",
    latitude: Number(doc.latitude),
    longitude: Number(doc.longitude),
    locationLabel: doc.locationLabel || null,
    district: doc.district || null,
    sector: doc.sector || null,
    status: doc.status || "pending",
    notes: doc.notes || null,
    confirmedBy: doc.confirmedBy || null,
    confirmedAt: doc.confirmedAt ? new Date(doc.confirmedAt).toISOString() : null,
    reportedAt: new Date(doc.reportedAt || doc.createdAt).toISOString(),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt || doc.createdAt).toISOString(),
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    const staffView = searchParams.get("all") === "1" || searchParams.get("scope") === "all"
    const statusFilter = searchParams.get("status")

    const client = await clientPromise
    const db = client.db(DB)

    const query: any = {}
    if (staffView && isStaff(currentUser.role)) {
      // staff sees everything
    } else if (farmerId) {
      if (!isStaff(currentUser.role) && farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      query.farmerId = farmerId
    } else {
      // No filter -> farmers only see their own; staff see all
      if (isStaff(currentUser.role)) {
        // all
      } else {
        query.farmerId = currentUser._id
      }
    }

    if (statusFilter && EPIDEMIC_STATUSES.includes(statusFilter as any)) {
      query.status = statusFilter
    }

    const records = await db.collection("epidemic_cases").find(query).sort({ reportedAt: -1, createdAt: -1 }).toArray()
    return NextResponse.json(records.map(toClientCase))
  } catch (error) {
    console.error("Error fetching epidemic cases:", error)
    return NextResponse.json({ error: "Failed to fetch epidemic cases" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      farmerId, animalId, animalName, animalType,
      diseaseName, symptoms, affectedCount, severity,
      latitude, longitude, locationLabel, district, sector, status, notes,
    } = body

    if (!diseaseName) return NextResponse.json({ error: "Disease name is required" }, { status: 400 })
    if (latitude == null || longitude == null || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return NextResponse.json({ error: "Valid coordinates are required" }, { status: 400 })
    }
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 })
    }

    const staff = isStaff(currentUser.role)

    // Farmers report on their own behalf; staff can report for any farmer (or an anonymous/org case)
    let targetFarmerId = farmerId || currentUser._id
    let targetFarmerName: string | null = null
    if (farmerId && staff) {
      const client = await clientPromise
      const db = client.db(DB)
      const farmer = await db.collection("users").findOne({ _id: new ObjectId(farmerId) })
      targetFarmerName = farmer?.name || null
      if (!farmer) targetFarmerId = currentUser._id
    } else if (farmerId && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    } else {
      targetFarmerName = currentUser.name || null
    }

    // Normalize free-text location fields: keep only known Rwanda districts;
    // otherwise store null (coordinates still pin the case accurately).
    const cleanDistrict = typeof district === "string" && district.trim() ? district.trim().slice(0, 60) : null
    const cleanSector = typeof sector === "string" && sector.trim() ? sector.trim().slice(0, 60) : null

    const finalStatus = EPIDEMIC_STATUSES.includes(status) ? status : "confirmed"
    // Submissions are public immediately. Only admins/superadmins may create a
    // case with a non-default status (e.g. pending/rejected).
    const resolvedStatus = canApprove(currentUser.role) ? finalStatus : "confirmed"

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId: targetFarmerId,
      farmerName: targetFarmerName || currentUser.name || null,
      animalId: animalId || null,
      animalName: animalName || null,
      animalType: animalType || null,
      diseaseName,
      symptoms: symptoms || null,
      affectedCount: Number(affectedCount) > 0 ? Number(affectedCount) : 1,
      severity: EPIDEMIC_SEVERITIES.includes(severity) ? severity : "medium",
      latitude: lat,
      longitude: lng,
      locationLabel: locationLabel || null,
      district: cleanDistrict,
      sector: cleanSector,
      status: resolvedStatus,
      notes: notes || null,
      confirmedBy: staff ? currentUser.name || null : null,
      confirmedAt: new Date(),
      reportedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      seeded: false,
    }

    const result = await db.collection("epidemic_cases").insertOne(record)

    // First time an admin writes a brand-new disease name, save it as a
    // selectable category so it can be picked from the dropdown later.
    if (canApprove(currentUser.role)) {
      await ensureEpidemicDisease(diseaseName)
    }

    // Any user typing a brand-new animal type gets it saved as a selectable
    // option for everyone (farmers know their local animals best).
    if (animalType && typeof animalType === "string") {
      await ensureEpidemicAnimalType(animalType)
    }

    await logActivity(currentUser._id, "epidemic.case_reported", `${diseaseName} at ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    console.error("Error creating epidemic case:", error)
    return NextResponse.json({ error: "Failed to save epidemic case" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, animalId, animalName, animalType, diseaseName, symptoms, affectedCount, severity, latitude, longitude, locationLabel, district, sector, status, notes } = body
    if (!id) return NextResponse.json({ error: "Case ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("epidemic_cases").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    const staff = isStaff(currentUser.role)
    if (!staff && existing.farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (latitude != null && longitude != null) {
      const lat = Number(latitude)
      const lng = Number(longitude)
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 })
      }
    }

    const $set: any = {
      animalId: animalId ?? existing.animalId ?? null,
      animalName: animalName ?? existing.animalName ?? null,
      animalType: animalType ?? existing.animalType ?? null,
      diseaseName: diseaseName ?? existing.diseaseName,
      symptoms: symptoms !== undefined ? symptoms : existing.symptoms,
      affectedCount: Number(affectedCount) > 0 ? Number(affectedCount) : existing.affectedCount || 1,
      severity: EPIDEMIC_SEVERITIES.includes(severity) ? severity : existing.severity || "medium",
      latitude: latitude !== undefined ? Number(latitude) : existing.latitude,
      longitude: longitude !== undefined ? Number(longitude) : existing.longitude,
      locationLabel: locationLabel !== undefined ? locationLabel : existing.locationLabel,
      district: typeof district === "string" && district.trim() ? district.trim().slice(0, 60) : existing.district,
      sector: typeof sector === "string" && sector.trim() ? sector.trim().slice(0, 60) : existing.sector,
      notes: notes !== undefined ? notes : existing.notes,
      updatedAt: new Date(),
    }

    // Only admins/superadmins may change status / confirmation metadata.
    // Recording who confirmed/resolved/rejected keeps an audit trail.
    if (canApprove(currentUser.role) && EPIDEMIC_STATUSES.includes(status)) {
      $set.status = status
      $set.confirmedBy = currentUser.name || existing.confirmedBy || null
      $set.confirmedAt = new Date()
    }

    await db.collection("epidemic_cases").updateOne({ _id: new ObjectId(id) }, { $set })
    await logActivity(currentUser._id, "epidemic.case_updated", diseaseName || id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating epidemic case:", error)
    return NextResponse.json({ error: "Failed to update epidemic case" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Case ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("epidemic_cases").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    if (!isStaff(currentUser.role) && existing.farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.collection("epidemic_cases").deleteOne({ _id: new ObjectId(id) })
    await logActivity(currentUser._id, "epidemic.case_deleted", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting epidemic case:", error)
    return NextResponse.json({ error: "Failed to delete epidemic case" }, { status: 500 })
  }
}
