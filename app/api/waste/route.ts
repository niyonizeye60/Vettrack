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
    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const query: any = { farmerId }
    const month = searchParams.get("month")
    if (month) {
      const [year, m] = month.split("-")
      const start = new Date(Number(year), Number(m) - 1, 1).toISOString().split("T")[0]
      const end = new Date(Number(year), Number(m), 1).toISOString().split("T")[0]
      query.date = { $gte: start, $lt: end }
    }

    const records = await db.collection("waste_records").find(query).sort({ date: -1, createdAt: -1 }).toArray()
    return NextResponse.json(records.map(r => ({ ...r, _id: r._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch waste records" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, animalId, animalName, wasteType, quantity, unit, homeConsumption, soldQuantity, pricePerUnit, totalAmount, disposalMethod, date, notes } = body

    if (!farmerId || !wasteType || !quantity || !date)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, animalId: animalId || null, animalName: animalName || null,
      wasteType, quantity: Number(quantity), unit,
      homeConsumption: homeConsumption != null ? Number(homeConsumption) : null,
      soldQuantity: soldQuantity != null ? Number(soldQuantity) : null,
      pricePerUnit: pricePerUnit ? Number(pricePerUnit) : null,
      totalAmount: totalAmount ? Number(totalAmount) : null,
      disposalMethod: disposalMethod || null,
      date, notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("waste_records").insertOne(record)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save waste record" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, animalId, animalName, wasteType, quantity, unit, homeConsumption, soldQuantity, pricePerUnit, totalAmount, disposalMethod, date, notes } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("waste_records").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("waste_records").updateOne(
      { _id: new ObjectId(id) },
      { $set: { animalId, animalName, wasteType, quantity: Number(quantity), unit,
        homeConsumption: homeConsumption != null ? Number(homeConsumption) : null,
        soldQuantity: soldQuantity != null ? Number(soldQuantity) : null,
        pricePerUnit: pricePerUnit ? Number(pricePerUnit) : null,
        totalAmount: totalAmount ? Number(totalAmount) : null,
        disposalMethod, date, notes, updatedAt: new Date() } }
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update waste record" }, { status: 500 })
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
      const existing = await db.collection("waste_records").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("waste_records").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete waste record" }, { status: 500 })
  }
}
