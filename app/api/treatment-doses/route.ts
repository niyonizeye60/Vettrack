export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"

const DB = "ntdm_animal_hospital"

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

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

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
    }

    const result = await db.collection("treatment_doses").insertOne(record)
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

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("treatment_doses").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
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

    await db.collection("treatment_doses").updateOne(
      { _id: new ObjectId(id) },
      { $set: { date, session, medicines: normalizedMedicines, vetCost: Number(vetCost) || 0, totalCost, notes, updatedAt: new Date() } }
    )
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

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("treatment_doses").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("treatment_doses").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete treatment dose" }, { status: 500 })
  }
}
