export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { resolveFarmAccess, logVetAction, diffRecord, provenanceFor, animalBelongsToFarm } from "@/lib/farm-access"

const DB = "ntdm_animal_hospital"
const MODULE = "health" as const

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

    const query: any = { farmerId }
    const status = searchParams.get("status")
    const month = searchParams.get("month")
    if (status) query.status = status
    if (month) {
      const [year, m] = month.split("-")
      const start = new Date(Number(year), Number(m) - 1, 1).toISOString().split("T")[0]
      const end = new Date(Number(year), Number(m), 1).toISOString().split("T")[0]
      query.diagnosedDate = { $gte: start, $lt: end }
    }

    const records = await db.collection("disease_records").find(query).sort({ diagnosedDate: -1, createdAt: -1 }).toArray()
    return NextResponse.json(records.map(r => ({ ...r, _id: r._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch disease records" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, animalId, animalName, diseaseName, symptoms, treatment, diagnosedDate, resolvedDate, status, notes, veterinarianName, vetOrigin } = body

    if (!farmerId || !animalId || !diseaseName || !diagnosedDate)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "create")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    // The write below mutates the animal document, so the animal must be on this farm.
    if (!(await animalBelongsToFarm(animalId, farmerId))) {
      return NextResponse.json({ error: "That animal is not on this farm" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, animalId, animalName: animalName || null,
      diseaseName, symptoms: symptoms || null,
      treatment: treatment || null,
      diagnosedDate, resolvedDate: resolvedDate || null,
      status: status || "Active",
      notes: notes || null,
      // When a delegated vet files the record, they are the veterinarian on it -
      // don't let a client-supplied name overwrite their own identity.
      veterinarianName: access.via === "grant" ? currentUser.name : (veterinarianName || null),
      vetOrigin: vetOrigin || null,
      createdAt: new Date(),
      ...provenanceFor(currentUser, "create"),
    }

    // Update the animal's status to "Sick" when a disease is recorded
    await db.collection("animals").updateOne(
      { _id: new ObjectId(animalId) },
      { $set: { status: "Sick", updatedAt: new Date() } }
    )

    const result = await db.collection("disease_records").insertOne(record)

    if (access.via === "grant") {
      await logVetAction({
        farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "health.create",
        recordId: result.insertedId.toString(),
        animalId,
        animalName: animalName || null,
        summary: `${currentUser.name} created a disease record (${diseaseName})${animalName ? ` for ${animalName}` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.disease_logged", `${diseaseName}${animalName ? ` for ${animalName}` : ''}`)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save disease record" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, animalId, animalName, diseaseName, symptoms, treatment, diagnosedDate, resolvedDate, status, notes, veterinarianName, vetOrigin } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("disease_records").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    // The record's own farmerId is the authority on which farm this belongs to -
    // never a farmerId from the request body.
    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "update", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    // Re-tie the animal to this record's farm - the resolve/resolved branch below
    // writes back to the animals collection.
    if (animalId && !(await animalBelongsToFarm(animalId, existing.farmerId))) {
      return NextResponse.json({ error: "That animal is not on this farm" }, { status: 403 })
    }

    const updated = {
      animalId, animalName, diseaseName, symptoms, treatment, diagnosedDate,
      resolvedDate: resolvedDate || null, status, notes, vetOrigin,
      // Which vet attended the case is attribution, not editable content: a delegated
      // vet cannot rewrite it - neither onto a colleague, nor onto themselves when
      // editing a record the farmer authored.
      veterinarianName: access.via === "grant" ? (existing.veterinarianName ?? null) : veterinarianName,
      ...provenanceFor(currentUser, "update"),
    }

    await db.collection("disease_records").updateOne({ _id: new ObjectId(id) }, { $set: updated })

    // If resolved, update the animal status back to Healthy
    if (status === "Resolved" && animalId) {
      const remaining = await db.collection("disease_records").countDocuments({
        animalId, status: { $in: ["Active", "Under Treatment"] }, _id: { $ne: new ObjectId(id) }
      })
      if (remaining === 0) {
        await db.collection("animals").updateOne(
          { _id: new ObjectId(animalId) },
          { $set: { status: "Healthy", updatedAt: new Date() } }
        )
      }
    }

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "health.update",
        recordId: id,
        animalId: animalId || null,
        animalName: animalName || null,
        summary: `${currentUser.name} updated a disease record (${diseaseName})${animalName ? ` for ${animalName}` : ""}`,
        changes: diffRecord(existing, updated),
      })
    }

    await logActivity(currentUser._id, "livestock.disease_updated", `${diseaseName}${animalName ? ` for ${animalName}` : ''}`)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update disease record" }, { status: 500 })
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

    const existing = await db.collection("disease_records").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "delete", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    await db.collection("disease_records").deleteOne({ _id: new ObjectId(id) })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "health.delete",
        recordId: id,
        animalId: existing.animalId || null,
        animalName: existing.animalName || null,
        summary: `${currentUser.name} deleted a disease record (${existing.diseaseName})${existing.animalName ? ` for ${existing.animalName}` : ""}`,
      })
    }

    await logActivity(currentUser._id, "livestock.disease_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete disease record" }, { status: 500 })
  }
}
