export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { animalBelongsToFarm } from "@/lib/farm-access"

const DB = "ntdm_animal_hospital"
const EXPENSE_TYPES = ["feed", "water", "health", "other"]

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    const animalId = searchParams.get("animalId")
    const expenseType = searchParams.get("expenseType")
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
    if (animalId) query.animalId = animalId
    if (expenseType) query.expenseType = expenseType
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    const expenses = await db.collection("animal_expenses").find(query).sort({ date: -1, createdAt: -1 }).toArray()
    return NextResponse.json(expenses.map(e => ({ ...e, _id: e._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch animal expenses" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, animalId, animalName, expenseType, description, amount, date, notes } = body

    if (!farmerId || !animalId || !expenseType || !amount || !date)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    if (!EXPENSE_TYPES.includes(expenseType))
      return NextResponse.json({ error: "Invalid expense type" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!(await animalBelongsToFarm(animalId, farmerId))) {
      return NextResponse.json({ error: "That animal is not on this farm" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, animalId, animalName: animalName || null, expenseType,
      description: description || null,
      amount: Number(amount),
      date, notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("animal_expenses").insertOne(record)
    await logActivity(currentUser._id, "livestock.animal_expense_logged", `${expenseType} expense for ${animalName || animalId}`)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save animal expense" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, expenseType, description, amount, date, notes } = body
    if (!id) return NextResponse.json({ error: "Expense ID required" }, { status: 400 })
    if (expenseType && !EXPENSE_TYPES.includes(expenseType))
      return NextResponse.json({ error: "Invalid expense type" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("animal_expenses").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("animal_expenses").updateOne(
      { _id: new ObjectId(id) },
      { $set: { expenseType, description: description || null, amount: Number(amount), date, notes: notes || null, updatedAt: new Date() } }
    )
    await logActivity(currentUser._id, "livestock.animal_expense_updated", expenseType)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update animal expense" }, { status: 500 })
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
    if (!id) return NextResponse.json({ error: "Expense ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("animal_expenses").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("animal_expenses").deleteOne({ _id: new ObjectId(id) })
    await logActivity(currentUser._id, "livestock.animal_expense_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete animal expense" }, { status: 500 })
  }
}
