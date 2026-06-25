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
    const body = await req.json()
    const { farmerId, animalId, animalName, semenTypes, semenPrice, vetPrice, injectionTime, expectedBirthDate, deliveredBabies, vetName, vetOrigin, date, notes, previousRecordId } = body
    if (!farmerId || !date) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

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
      vetName: vetName || null,
      vetOrigin: vetOrigin || null,
      date, notes: notes || null,
      previousRecordId: previousRecordId || null,
      pregnancyFailed: false,
      createdAt: new Date(),
    }

    const result = await db.collection("insemination_records").insertOne(record)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, animalId, animalName, semenTypes, semenPrice, vetPrice, injectionTime, expectedBirthDate, deliveredBabies, vetName, vetOrigin, date, notes, previousRecordId, pregnancyFailed } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    await db.collection("insemination_records").updateOne(
      { _id: new ObjectId(id) },
      { $set: { animalId: animalId || null, animalName: animalName || null, semenTypes: semenTypes || [], semenPrice: semenPrice ? Number(semenPrice) : null, vetPrice: vetPrice ? Number(vetPrice) : null, injectionTime: injectionTime || null, expectedBirthDate: expectedBirthDate || null, deliveredBabies: deliveredBabies != null ? Number(deliveredBabies) : null, vetName: vetName || null, vetOrigin: vetOrigin || null, date, notes: notes || null, previousRecordId: previousRecordId || null, pregnancyFailed: !!pregnancyFailed, updatedAt: new Date() } }
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    await db.collection("insemination_records").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 })
  }
}
