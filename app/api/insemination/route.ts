export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { resolveFarmAccess, logVetAction, diffRecord, provenanceFor, animalBelongsToFarm } from "@/lib/farm-access"

const DB = "ntdm_animal_hospital"
const MODULE = "insemination" as const

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

    const records = await db.collection("insemination_records")
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
    const { farmerId, animalId, animalName, semenTypes, semenPrice, vetPrice, injectionTime, expectedBirthDate, deliveredBabies, vetName, vetOrigin, date, notes, previousRecordId } = body
    if (!farmerId || !date) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "create")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    // animalId is optional here, but when supplied it must be on this farm so a
    // record can never be attached to another farmer's animal.
    if (animalId && !(await animalBelongsToFarm(animalId, farmerId))) {
      return NextResponse.json({ error: "That animal is not on this farm" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, animalId: animalId || null, animalName: animalName || null,
      semenTypes: semenTypes || [],
      semenPrice: semenPrice ? Number(semenPrice) : null,
      vetPrice: vetPrice ? Number(vetPrice) : null,
      injectionTime: injectionTime || null,
      expectedBirthDate: expectedBirthDate || null,
      deliveredBabies: deliveredBabies != null ? Number(deliveredBabies) : null,
      // A delegated vet performing the insemination is the vet on the record -
      // their own identity, not a client-supplied name.
      vetName: access.via === "grant" ? currentUser.name : (vetName || null),
      vetOrigin: vetOrigin || null,
      date, notes: notes || null,
      previousRecordId: previousRecordId || null,
      pregnancyFailed: false,
      createdAt: new Date(),
      ...provenanceFor(currentUser, "create"),
    }

    const result = await db.collection("insemination_records").insertOne(record)

    if (access.via === "grant") {
      await logVetAction({
        farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "insemination.create",
        recordId: result.insertedId.toString(),
        animalId: animalId || null,
        animalName: animalName || null,
        summary: `${currentUser.name} created an insemination record${animalName ? ` for ${animalName}` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.insemination_logged", animalName || "animal")
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
    const { id, animalId, animalName, semenTypes, semenPrice, vetPrice, injectionTime, expectedBirthDate, deliveredBabies, vetName, vetOrigin, date, notes, previousRecordId, pregnancyFailed } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("insemination_records").findOne({ _id: new ObjectId(id) })
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
      animalId: animalId || null,
      animalName: animalName || null,
      semenTypes: semenTypes || [],
      semenPrice: semenPrice ? Number(semenPrice) : null,
      vetPrice: vetPrice ? Number(vetPrice) : null,
      injectionTime: injectionTime || null,
      expectedBirthDate: expectedBirthDate || null,
      deliveredBabies: deliveredBabies != null ? Number(deliveredBabies) : null,
      // Who performed the insemination is attribution, not editable content: a
      // delegated vet cannot rewrite it - neither onto a colleague, nor onto
      // themselves when editing a record the farmer authored.
      vetName: access.via === "grant" ? (existing.vetName ?? null) : (vetName || null),
      vetOrigin: vetOrigin || null,
      date,
      notes: notes || null,
      previousRecordId: previousRecordId || null,
      pregnancyFailed: !!pregnancyFailed,
      ...provenanceFor(currentUser, "update"),
    }

    await db.collection("insemination_records").updateOne({ _id: new ObjectId(id) }, { $set: updated })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "insemination.update",
        recordId: id,
        animalId: animalId || null,
        animalName: animalName || null,
        summary: `${currentUser.name} updated an insemination record${animalName ? ` for ${animalName}` : ""}`,
        changes: diffRecord(existing, updated),
      })
    }

    await logActivity(currentUser._id, "livestock.insemination_updated", animalName || id)
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

    const existing = await db.collection("insemination_records").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "delete", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    await db.collection("insemination_records").deleteOne({ _id: new ObjectId(id) })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "insemination.delete",
        recordId: id,
        animalId: existing.animalId || null,
        animalName: existing.animalName || null,
        summary: `${currentUser.name} deleted an insemination record${existing.animalName ? ` for ${existing.animalName}` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.insemination_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 })
  }
}
