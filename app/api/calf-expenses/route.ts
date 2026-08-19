export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { calfBelongsToFarm } from "@/lib/farm-access"
import { getHomeConsumptionBalance } from "@/lib/home-consumption"

const DB = "ntdm_animal_hospital"

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const farmerId = searchParams.get("farmerId")
    const calfId = searchParams.get("calfId")
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
    if (calfId) query.calfId = calfId
    if (expenseType) query.expenseType = expenseType
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    const expenses = await db.collection("calf_expenses").find(query).sort({ date: -1, createdAt: -1 }).toArray()
    return NextResponse.json(expenses.map(e => ({ ...e, _id: e._id.toString() })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch calf expenses" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, calfId, calfName, expenseType, milkLiters, description, amount, date, notes } = body

    if (!farmerId || !calfId || !expenseType || !amount || !date)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    if (!["milk", "feed", "veterinary", "other"].includes(expenseType))
      return NextResponse.json({ error: "Invalid expense type" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!(await calfBelongsToFarm(calfId, farmerId))) {
      return NextResponse.json({ error: "That calf is not on this farm" }, { status: 403 })
    }

    if (expenseType === "milk") {
      const liters = Number(milkLiters)
      if (!milkLiters || !(liters > 0)) {
        return NextResponse.json({ error: "Enter how many liters of milk the calf consumed" }, { status: 400 })
      }
      const { balance } = await getHomeConsumptionBalance(farmerId)
      if (liters > balance) {
        return NextResponse.json({ error: `Only ${balance.toFixed(1)}L of home consumption milk is available` }, { status: 400 })
      }
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, calfId, calfName: calfName || null, expenseType,
      milkLiters: expenseType === "milk" && milkLiters ? Number(milkLiters) : null,
      description: description || null,
      amount: Number(amount),
      date, notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("calf_expenses").insertOne(record)
    await logActivity(currentUser._id, "livestock.calf_expense_logged", `${expenseType} expense for ${calfName || calfId}`)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch {
    return NextResponse.json({ error: "Failed to save calf expense" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, expenseType, milkLiters, description, amount, date, notes } = body
    if (!id) return NextResponse.json({ error: "Expense ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("calf_expenses").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && existing.farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (expenseType === "milk") {
      const liters = Number(milkLiters)
      if (!milkLiters || !(liters > 0)) {
        return NextResponse.json({ error: "Enter how many liters of milk the calf consumed" }, { status: 400 })
      }
      const { totalRecorded, totalConsumedByCalves } = await getHomeConsumptionBalance(existing.farmerId)
      const consumedByOthers = totalConsumedByCalves - (existing.expenseType === "milk" ? (existing.milkLiters || 0) : 0)
      const availableBalance = Math.max(0, totalRecorded - consumedByOthers)
      if (liters > availableBalance) {
        return NextResponse.json({ error: `Only ${availableBalance.toFixed(1)}L of home consumption milk is available` }, { status: 400 })
      }
    }

    await db.collection("calf_expenses").updateOne(
      { _id: new ObjectId(id) },
      { $set: { expenseType, milkLiters: expenseType === "milk" && milkLiters ? Number(milkLiters) : null, description: description || null, amount: Number(amount), date, notes: notes || null, updatedAt: new Date() } }
    )
    await logActivity(currentUser._id, "livestock.calf_expense_updated", expenseType)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update calf expense" }, { status: 500 })
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
      const existing = await db.collection("calf_expenses").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("calf_expenses").deleteOne({ _id: new ObjectId(id) })
    await logActivity(currentUser._id, "livestock.calf_expense_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete calf expense" }, { status: 500 })
  }
}
