export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { resolveFarmAccess, logVetAction, diffRecord, provenanceFor } from "@/lib/farm-access"

const DB = "ntdm_animal_hospital"
// Treatment doses are part of disease management, so they ride on the same "health"
// permission the farmer grants for disease records rather than a separate toggle.
const MODULE = "health" as const

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    const diseaseRecordId = searchParams.get("diseaseRecordId")

    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "view")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const query: any = { farmerId }
    if (diseaseRecordId) query.diseaseRecordId = diseaseRecordId

    const doses = await db.collection("treatment_doses").find(query).sort({ date: -1, session: 1 }).toArray()
    return NextResponse.json(doses.map(d => ({ ...d, _id: d._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch treatment doses" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, diseaseRecordId, animalId, animalName, diseaseName, date, session, medicines, vetCost, notes } = body

    if (!farmerId || !diseaseRecordId || !date || !session)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    if (!Array.isArray(medicines) || medicines.length === 0)
      return NextResponse.json({ error: "At least one medicine is required" }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "create")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    const client = await clientPromise
    const db = client.db(DB)

    // The dose hangs off a disease case - that case must belong to this farm, or a
    // caller could attach doses to another farmer's record.
    const parent = await db.collection("disease_records").findOne({ _id: new ObjectId(diseaseRecordId) })
    if (!parent || parent.farmerId !== farmerId) {
      return NextResponse.json({ error: "That disease case is not on this farm" }, { status: 403 })
    }

    const normalizedMedicines = medicines.map((m: any) => ({
      ...(m.medicineId ? { medicineId: m.medicineId } : {}),
      medicineName: m.medicineName,
      doseCount: Number(m.doseCount) || 0,
      volumeMl: m.volumeMl ? Number(m.volumeMl) : null,
      cost: Number(m.cost) || 0,
    }))
    const medicineCost = normalizedMedicines.reduce((s, m) => s + m.cost, 0)

    const record = {
      farmerId, diseaseRecordId, animalId, animalName: animalName || null,
      diseaseName: diseaseName || null,
      date, session,
      medicines: normalizedMedicines,
      vetCost: vetCost ? Number(vetCost) : 0,
      totalCost: medicineCost + (vetCost ? Number(vetCost) : 0),
      notes: notes || null,
      createdAt: new Date(),
      ...provenanceFor(currentUser, "create"),
    }

    const result = await db.collection("treatment_doses").insertOne(record)

    if (access.via === "grant") {
      await logVetAction({
        farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "health.dose_create",
        recordId: result.insertedId.toString(),
        animalId: animalId || null,
        animalName: animalName || null,
        summary: `${currentUser.name} logged a treatment dose${animalName ? ` for ${animalName}` : ""}${diseaseName ? ` (${diseaseName})` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.treatment_logged", `${diseaseName || "treatment"}${animalName ? ` for ${animalName}` : ""}`)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save treatment dose" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, date, session, medicines, vetCost, notes } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })
    if (!Array.isArray(medicines) || medicines.length === 0)
      return NextResponse.json({ error: "At least one medicine is required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("treatment_doses").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "update", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    const normalizedMedicines = medicines.map((m: any) => ({
      ...(m.medicineId ? { medicineId: m.medicineId } : {}),
      medicineName: m.medicineName,
      doseCount: Number(m.doseCount) || 0,
      volumeMl: m.volumeMl ? Number(m.volumeMl) : null,
      cost: Number(m.cost) || 0,
    }))
    const medicineCost = normalizedMedicines.reduce((s, m) => s + m.cost, 0)
    const totalCost = medicineCost + (Number(vetCost) || 0)

    const updated = {
      date, session, medicines: normalizedMedicines,
      vetCost: Number(vetCost) || 0, totalCost, notes,
      ...provenanceFor(currentUser, "update"),
    }

    await db.collection("treatment_doses").updateOne({ _id: new ObjectId(id) }, { $set: updated })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "health.dose_update",
        recordId: id,
        animalId: existing.animalId || null,
        animalName: existing.animalName || null,
        summary: `${currentUser.name} updated a treatment dose${existing.animalName ? ` for ${existing.animalName}` : ""}`,
        changes: diffRecord(existing, updated),
      })
    }

    await logActivity(currentUser._id, "livestock.treatment_updated", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update treatment dose" }, { status: 500 })
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
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("treatment_doses").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "delete", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    await db.collection("treatment_doses").deleteOne({ _id: new ObjectId(id) })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "health.dose_delete",
        recordId: id,
        animalId: existing.animalId || null,
        animalName: existing.animalName || null,
        summary: `${currentUser.name} deleted a treatment dose${existing.animalName ? ` for ${existing.animalName}` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.treatment_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete treatment dose" }, { status: 500 })
  }
}
