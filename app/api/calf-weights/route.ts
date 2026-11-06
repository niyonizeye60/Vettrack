export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { resolveFarmAccess, calfBelongsToFarm, logVetAction, diffRecord, provenanceFor } from "@/lib/farm-access"

const DB = "ntdm_animal_hospital"
// The farmer can delegate the Weight Log to a vet as part of the "calves" module.
const MODULE = "calves" as const

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    const calfId = searchParams.get("calfId")
    const pageParam = searchParams.get("page")
    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "view")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const query: any = { farmerId }
    if (calfId) query.calfId = calfId

    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1)
      const pageSize = Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10)

      const total = await db.collection("calf_weights").countDocuments(query)
      const weights = await db.collection("calf_weights")
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray()

      return NextResponse.json({
        weights: weights.map(w => ({ ...w, _id: w._id.toString() })),
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      })
    }

    const weights = await db.collection("calf_weights").find(query).sort({ date: -1, createdAt: -1 }).toArray()
    return NextResponse.json(weights.map(w => ({ ...w, _id: w._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch weight records" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, calfId, calfName, weight, date, notes } = body

    if (!farmerId || !calfId || !weight || !date)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "create")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    if (!(await calfBelongsToFarm(calfId, farmerId))) {
      return NextResponse.json({ error: "That calf is not on this farm" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, calfId, calfName: calfName || null,
      weight: Number(weight), date, notes: notes || null,
      createdAt: new Date(),
      ...provenanceFor(currentUser, "create"),
    }

    const result = await db.collection("calf_weights").insertOne(record)

    if (access.via === "grant") {
      await logVetAction({
        farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "calf_weight.create",
        recordId: result.insertedId.toString(),
        animalId: calfId,
        animalName: calfName || null,
        summary: `${currentUser.name} recorded a weight of ${Number(weight)} kg${calfName ? ` for ${calfName}` : ""} (calf)`,
      })
    }

    await logActivity(currentUser._id, "livestock.calf_weight_logged", `${weight}kg for ${calfName || calfId}`)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save weight record" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, weight, date, notes } = body
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("calf_weights").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    // The record's own farmerId decides which farm this is, never one the caller sends.
    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "update", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    const updated = { weight: Number(weight), date, notes: notes || null }
    await db.collection("calf_weights").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updated, ...provenanceFor(currentUser, "update") } }
    )

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "calf_weight.update",
        recordId: id,
        animalId: existing.calfId || null,
        animalName: existing.calfName || null,
        summary: `${currentUser.name} updated a weight record${existing.calfName ? ` for ${existing.calfName}` : ""} (calf)`,
        changes: diffRecord(existing, updated),
      })
    }

    await logActivity(currentUser._id, "livestock.calf_weight_updated", `${weight}kg`)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update weight record" }, { status: 500 })
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
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("calf_weights").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "delete", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }

    await db.collection("calf_weights").deleteOne({ _id: new ObjectId(id) })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "calf_weight.delete",
        recordId: id,
        animalId: existing.calfId || null,
        animalName: existing.calfName || null,
        summary: `${currentUser.name} deleted a weight record${existing.calfName ? ` for ${existing.calfName}` : ""} (calf)`,
      })
    }

    await logActivity(currentUser._id, "livestock.calf_weight_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete weight record" }, { status: 500 })
  }
}
