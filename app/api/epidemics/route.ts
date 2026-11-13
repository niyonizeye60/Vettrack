export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId, type Db } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { notificationText } from "@/lib/notification-messages"
import { notifyAdmins } from "@/lib/admin-notifications"
import { checkForOutbreak } from "@/lib/admin-alerts"

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

/** What the public map shows of a case (app/api/epidemics/public). */
const PUBLIC_CASE_FIELDS = [
  "diseaseName", "animalType", "animalName", "affectedCount", "severity",
  "latitude", "longitude", "locationLabel", "district", "sector",
] as const

/** Tell every admin a reported case is waiting for them to confirm or reject it. */
async function alertCaseToReview(db: Db, doc: any, reporterName: string | null | undefined) {
  const place =
    [doc.district, doc.sector].filter(Boolean).join(", ") ||
    doc.locationLabel ||
    `${Number(doc.latitude).toFixed(4)}, ${Number(doc.longitude).toFixed(4)}`
  await notifyAdmins(db, {
    text: notificationText("epidemicCaseReported", {
      reporter: String(reporterName || doc.farmerName || "Someone"),
      disease: String(doc.diseaseName),
      severity: { keys: [`epidemic.severity.${doc.severity}`], text: String(doc.severity) },
      place: String(place),
    }),
    type: "epidemic",
    priority: doc.severity === "high" || doc.severity === "critical" ? "high" : "normal",
    actionUrl: `/admin/epidemics?case=${doc._id.toString()}`,
  })
}

/**
 * Who reported a case. Cases from before reportedById was kept fall back to farmerId,
 * which was the reporter whenever they filed for themselves.
 */
function reporterId(doc: any): string | null {
  if (doc.reportedById) return String(doc.reportedById)
  return doc.farmerId ? String(doc.farmerId) : null
}

/**
 * A farmer or vet deleting a case only hides it (deletedAt): an admin can still see it
 * and restore it, or remove it for good. Everyone else's queries leave these out.
 */
const NOT_DELETED = { deletedAt: null }

function toClientCase(doc: any, viewer: { _id: string; role: string }): EpidemicCase {
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
    canDelete: canApprove(viewer.role) || (!doc.deletedAt && reporterId(doc) === viewer._id),
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt).toISOString() : null,
    deletedByName: doc.deletedByName || null,
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
    // Deleted cases are for admins to restore or remove; nobody else sees them.
    if (!canApprove(currentUser.role)) Object.assign(query, NOT_DELETED)

    const records = await db.collection("epidemic_cases").find(query).sort({ reportedAt: -1, createdAt: -1 }).toArray()
    return NextResponse.json(records.map((doc) => toClientCase(doc, currentUser)))
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

    // A farmer's or vet's report waits as "pending" - off the public map - until an admin
    // confirms it. Admins' own reports default to confirmed, and only they may pick a status.
    const approver = canApprove(currentUser.role)
    const resolvedStatus = approver ? (EPIDEMIC_STATUSES.includes(status) ? status : "confirmed") : "pending"
    const severityLevel = EPIDEMIC_SEVERITIES.includes(severity) ? severity : "medium"

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId: targetFarmerId,
      farmerName: targetFarmerName || currentUser.name || null,
      // Who filed it - a vet reporting for a farmer is the reporter, and only the
      // reporter (or an admin) may delete it.
      reportedById: currentUser._id,
      reportedByRole: currentUser.role,
      animalId: animalId || null,
      animalName: animalName || null,
      animalType: animalType || null,
      diseaseName,
      symptoms: symptoms || null,
      affectedCount: Number(affectedCount) > 0 ? Number(affectedCount) : 1,
      severity: severityLevel,
      latitude: lat,
      longitude: lng,
      locationLabel: locationLabel || null,
      district: cleanDistrict,
      sector: cleanSector,
      status: resolvedStatus,
      notes: notes || null,
      // Who confirmed (or otherwise decided) it - nobody yet, for a report awaiting review.
      confirmedBy: approver ? currentUser.name || null : null,
      confirmedAt: approver ? new Date() : null,
      reportedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      seeded: false,
    }

    const result = await db.collection("epidemic_cases").insertOne(record)

    if (!approver) {
      await alertCaseToReview(db, { ...record, _id: result.insertedId }, currentUser.name)
    }
    await checkForOutbreak(db, { _id: result.insertedId, diseaseName: record.diseaseName, district: record.district })

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

    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    const existing = await db.collection("epidemic_cases").findOne({ _id: new ObjectId(id) })
    // A deleted case is changed only by restoring it first (PATCH).
    if (!existing || existing.deletedAt) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    // Admins may change any case; farmers and vets only the ones they reported - the same
    // rule as deleting.
    if (!canApprove(currentUser.role) && reporterId(existing) !== currentUser._id) {
      return NextResponse.json({ error: "You can only edit cases you reported" }, { status: 403 })
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
      if (status === "pending") {
        // Moved back to waiting for review (e.g. a report published before reviews
        // existed): nobody has confirmed it now. The activity log keeps who did this.
        $set.confirmedBy = null
        $set.confirmedAt = null
      } else {
        $set.confirmedBy = currentUser.name || existing.confirmedBy || null
        $set.confirmedAt = new Date()
      }
    }

    // What an admin confirmed is what the public map shows. If anyone else changes any of
    // it, the case goes back to waiting for review instead of showing unchecked details.
    const backToReview =
      !canApprove(currentUser.role) &&
      existing.status === "confirmed" &&
      PUBLIC_CASE_FIELDS.some((field) => String($set[field] ?? "") !== String(existing[field] ?? ""))
    if (backToReview) {
      $set.status = "pending"
      $set.confirmedBy = null
      $set.confirmedAt = null
    }

    await db.collection("epidemic_cases").updateOne({ _id: new ObjectId(id) }, { $set })
    if (backToReview) {
      await alertCaseToReview(db, { ...existing, ...$set }, currentUser.name)
    }
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
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    const client = await clientPromise
    const db = client.db(DB)
    const cases = db.collection("epidemic_cases")

    const existing = await cases.findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    // Admins remove a case for good - a live one, or one a farmer or vet deleted.
    if (canApprove(currentUser.role)) {
      await cases.deleteOne({ _id: existing._id })
      await logActivity(currentUser._id, "epidemic.case_deleted", `${existing.diseaseName || id} (permanently)`)
      return NextResponse.json({ success: true, permanent: true })
    }

    // Farmers and vets may delete only the reports they filed, and only hide them.
    if (existing.deletedAt) return NextResponse.json({ error: "Case not found" }, { status: 404 })
    if (reporterId(existing) !== currentUser._id) {
      return NextResponse.json({ error: "You can only delete cases you reported" }, { status: 403 })
    }

    await cases.updateOne(
      { _id: existing._id, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          deletedById: currentUser._id,
          deletedByName: currentUser.name || null,
          deletedByRole: currentUser.role,
        },
      }
    )
    await logActivity(currentUser._id, "epidemic.case_deleted", existing.diseaseName || id)
    return NextResponse.json({ success: true, permanent: false })
  } catch (error) {
    console.error("Error deleting epidemic case:", error)
    return NextResponse.json({ error: "Failed to delete epidemic case" }, { status: 500 })
  }
}

// PATCH { id, action: "restore" }: an admin brings back a case a farmer or vet deleted,
// with the status it had - a confirmed case goes straight back on the public map.
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!canApprove(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, action } = await req.json()
    if (action !== "restore") return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const client = await clientPromise
    const db = client.db(DB)
    const result = await db.collection("epidemic_cases").findOneAndUpdate(
      { _id: new ObjectId(id), deletedAt: { $ne: null } },
      {
        $unset: { deletedAt: "", deletedById: "", deletedByName: "", deletedByRole: "" },
        $set: { updatedAt: new Date() },
      }
    )
    if (!result) return NextResponse.json({ error: "Case not found" }, { status: 404 })

    await logActivity(currentUser._id, "epidemic.case_restored", result.diseaseName || id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error restoring epidemic case:", error)
    return NextResponse.json({ error: "Failed to restore epidemic case" }, { status: 500 })
  }
}
