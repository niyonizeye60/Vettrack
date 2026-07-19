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
    const transactionType = searchParams.get("transactionType")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const query: any = { farmerId }
    if (transactionType) query.transactionType = transactionType
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    const records = await db.collection("animal_transactions").find(query).sort({ date: -1, createdAt: -1 }).toArray()
    return NextResponse.json(records.map(r => ({ ...r, _id: r._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch animal transactions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, animalId, animalName, animalType, transactionType, quantity, amount, party, date, notes } = body

    if (!farmerId || !animalName || !transactionType || !amount || !date)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    if (!["sale", "purchase"].includes(transactionType))
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId,
      animalId: animalId || null,
      animalName,
      animalType: animalType || null,
      transactionType,
      quantity: quantity ? Number(quantity) : 1,
      amount: Number(amount),
      party: party || null,
      date,
      notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("animal_transactions").insertOne(record)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save animal transaction" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, animalId, animalName, animalType, transactionType, quantity, amount, party, date, notes } = body
    if (!id) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("animal_transactions").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("animal_transactions").updateOne(
      { _id: new ObjectId(id) },
      { $set: { animalId: animalId || null, animalName, animalType: animalType || null, transactionType, quantity: quantity ? Number(quantity) : 1, amount: Number(amount), party: party || null, date, notes: notes || null, updatedAt: new Date() } }
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update animal transaction" }, { status: 500 })
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
    if (!id) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("animal_transactions").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("animal_transactions").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete animal transaction" }, { status: 500 })
  }
}
