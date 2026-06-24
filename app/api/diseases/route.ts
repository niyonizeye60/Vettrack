export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB = "ntdm_animal_hospital"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

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
    const body = await req.json()
    const { farmerId, animalId, animalName, diseaseName, symptoms, treatment, diagnosedDate, resolvedDate, status, notes, veterinarianName, vetOrigin } = body

    if (!farmerId || !animalId || !diseaseName || !diagnosedDate)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, animalId, animalName: animalName || null,
      diseaseName, symptoms: symptoms || null,
      treatment: treatment || null,
      diagnosedDate, resolvedDate: resolvedDate || null,
      status: status || "Active",
      notes: notes || null,
      veterinarianName: veterinarianName || null,
      vetOrigin: vetOrigin || null,
      createdAt: new Date(),
    }

    // Update the animal's status to "Sick" when a disease is recorded
    await db.collection("animals").updateOne(
      { _id: new ObjectId(animalId) },
      { $set: { status: "Sick", updatedAt: new Date() } }
    )

    const result = await db.collection("disease_records").insertOne(record)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save disease record" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, animalId, animalName, diseaseName, symptoms, treatment, diagnosedDate, resolvedDate, status, notes, veterinarianName, vetOrigin } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    await db.collection("disease_records").updateOne(
      { _id: new ObjectId(id) },
      { $set: { animalId, animalName, diseaseName, symptoms, treatment, diagnosedDate, resolvedDate: resolvedDate || null, status, notes, veterinarianName, vetOrigin, updatedAt: new Date() } }
    )

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

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update disease record" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    await db.collection("disease_records").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete disease record" }, { status: 500 })
  }
}
