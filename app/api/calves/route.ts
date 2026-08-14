export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"

const DB = "ntdm_animal_hospital"

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const calves = await db.collection("calves").find({ farmerId }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(calves.map(c => ({ ...c, _id: c._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch calves" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, name, motherAnimalId, motherName, gender, breed, birthDate, birthWeight, status, notes } = body

    if (!farmerId || !name || !gender || !birthDate)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const calf = {
      farmerId, name,
      motherAnimalId: motherAnimalId || null,
      motherName: motherName || null,
      gender, breed: breed || null,
      birthDate,
      birthWeight: birthWeight ? Number(birthWeight) : null,
      status: status || "active",
      notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("calves").insertOne(calf)
    await logActivity(currentUser._id, "livestock.calf_registered", name)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save calf" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, motherAnimalId, motherName, gender, breed, birthDate, birthWeight, status, notes } = body
    if (!id) return NextResponse.json({ error: "Calf ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("calves").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Calf not found" }, { status: 404 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && existing.farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Once a calf has been moved into the animals herd its status is a fact about
    // what happened, not a field to edit - reverting it would leave the animal row
    // orphaned and let the calf be graduated a second time.
    const nextStatus = existing.graduatedToAnimalId ? "graduated" : status

    await db.collection("calves").updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, motherAnimalId: motherAnimalId || null, motherName: motherName || null, gender, breed: breed || null, birthDate, birthWeight: birthWeight ? Number(birthWeight) : null, status: nextStatus, notes: notes || null, updatedAt: new Date() } }
    )
    await logActivity(currentUser._id, "livestock.calf_updated", name)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update calf" }, { status: 500 })
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
    if (!id) return NextResponse.json({ error: "Calf ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("calves").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("calves").deleteOne({ _id: new ObjectId(id) })
    await db.collection("calf_weights").deleteMany({ calfId: id })
    await db.collection("calf_expenses").deleteMany({ calfId: id })
    // vaccination_records are deliberately NOT cascaded: a growth log or an expense
    // line is only meaningful while the calf is on the books, but a vaccination is a
    // health record, and deleting it would also silently rewrite the farm's P&L for a
    // period already reported. Those rows keep the denormalized subjectName, so the
    // vaccination history still reads correctly once the calf row is gone.
    await logActivity(currentUser._id, "livestock.calf_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete calf" }, { status: 500 })
  }
}
