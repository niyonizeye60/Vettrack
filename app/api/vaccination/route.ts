export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { resolveFarmAccess, logVetAction, diffRecord, provenanceFor, animalBelongsToFarm } from "@/lib/farm-access"

const DB = "ntdm_animal_hospital"
const MODULE = "vaccination" as const

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "view")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const records = await db.collection("vaccination_records")
      .find({ farmerId })
      .sort({ date: -1, createdAt: -1 })
      .toArray()

    return NextResponse.json(records.map(r => ({ ...r, _id: r._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
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
      farmerId, animalId, animalName, vaccineName, diseasePrevented, vaccineType,
      date, dose, doseUnit, route, site, batchNumber, manufacturer, expiryDate,
      vaccinePrice, vetPrice, vaccinator, nextVaccinationDate, notes,
    } = body
    if (!farmerId || !vaccineName || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "create")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    // A vaccination is always given to a specific animal, and that animal must be on
    // this farm - a caller authorized on farm A can never file against farm B's animal.
    if (!animalId) return NextResponse.json({ error: "Animal required" }, { status: 400 })
    if (!(await animalBelongsToFarm(animalId, farmerId))) {
      return NextResponse.json({ error: "That animal is not on this farm" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, animalId, animalName: animalName || null,
      vaccineName,
      diseasePrevented: diseasePrevented || null,
      vaccineType: vaccineType || null,
      date,
      dose: dose != null && dose !== "" ? Number(dose) : null,
      doseUnit: doseUnit || null,
      route: route || null,
      site: site || null,
      batchNumber: batchNumber || null,
      manufacturer: manufacturer || null,
      expiryDate: expiryDate || null,
      // Both feed the farm's profit & loss statement (app/api/reports/general).
      vaccinePrice: vaccinePrice ? Number(vaccinePrice) : null,
      vetPrice: vetPrice ? Number(vetPrice) : null,
      // A delegated vet administering the vaccine is the vaccinator on the record -
      // their own identity, not a client-supplied name.
      vaccinator: access.via === "grant" ? currentUser.name : (vaccinator || null),
      nextVaccinationDate: nextVaccinationDate || null,
      notes: notes || null,
      createdAt: new Date(),
      ...provenanceFor(currentUser, "create"),
    }

    const result = await db.collection("vaccination_records").insertOne(record)

    if (access.via === "grant") {
      await logVetAction({
        farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "vaccination.create",
        recordId: result.insertedId.toString(),
        animalId,
        animalName: animalName || null,
        summary: `${currentUser.name} recorded a ${vaccineName} vaccination${animalName ? ` for ${animalName}` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.vaccination_logged", `${vaccineName}${animalName ? ` — ${animalName}` : ""}`)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      id, animalId, animalName, vaccineName, diseasePrevented, vaccineType,
      date, dose, doseUnit, route, site, batchNumber, manufacturer, expiryDate,
      vaccinePrice, vetPrice, vaccinator, nextVaccinationDate, notes,
    } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("vaccination_records").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    // The record's own farmerId decides which farm this belongs to - never a
    // farmerId supplied by the caller.
    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "update", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    if (animalId && !(await animalBelongsToFarm(animalId, existing.farmerId))) {
      return NextResponse.json({ error: "That animal is not on this farm" }, { status: 403 })
    }

    const updated = {
      animalId: animalId || existing.animalId,
      animalName: animalName || null,
      vaccineName,
      diseasePrevented: diseasePrevented || null,
      vaccineType: vaccineType || null,
      date,
      dose: dose != null && dose !== "" ? Number(dose) : null,
      doseUnit: doseUnit || null,
      route: route || null,
      site: site || null,
      batchNumber: batchNumber || null,
      manufacturer: manufacturer || null,
      expiryDate: expiryDate || null,
      vaccinePrice: vaccinePrice ? Number(vaccinePrice) : null,
      vetPrice: vetPrice ? Number(vetPrice) : null,
      // Who administered the vaccine is attribution, not editable content: a delegated
      // vet cannot rewrite it - neither onto a colleague, nor onto themselves when
      // editing a record the farmer authored.
      vaccinator: access.via === "grant" ? (existing.vaccinator ?? null) : (vaccinator || null),
      nextVaccinationDate: nextVaccinationDate || null,
      notes: notes || null,
      ...provenanceFor(currentUser, "update"),
    }

    await db.collection("vaccination_records").updateOne({ _id: new ObjectId(id) }, { $set: updated })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "vaccination.update",
        recordId: id,
        animalId: animalId || existing.animalId,
        animalName: animalName || null,
        summary: `${currentUser.name} updated a vaccination record${animalName ? ` for ${animalName}` : ""}`,
        changes: diffRecord(existing, updated),
      })
    }

    await logActivity(currentUser._id, "livestock.vaccination_updated", animalName || id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
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

    const existing = await db.collection("vaccination_records").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "delete", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    await db.collection("vaccination_records").deleteOne({ _id: new ObjectId(id) })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "vaccination.delete",
        recordId: id,
        animalId: existing.animalId || null,
        animalName: existing.animalName || null,
        summary: `${currentUser.name} deleted a vaccination record${existing.animalName ? ` for ${existing.animalName}` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.vaccination_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 })
  }
}
