export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { resolveFarmAccess, calfBelongsToFarm, logVetAction, diffRecord, provenanceFor } from "@/lib/farm-access"
import { DELEGATE_CALF_EXPENSE_TYPE } from "@/lib/permissions"
import { getHomeConsumptionBalance } from "@/lib/home-consumption"

const DB = "ntdm_animal_hospital"
// The farmer can delegate the Expenses tab to a vet as part of the "calves" module.
const MODULE = "calves" as const
// A vet only ever sees and records veterinary expenses: milk and feed are the farmer's
// own costs, so they stay out of the vet's view even though they share this collection.
const VET_ONLY_ERROR = "You can only record veterinary expenses"

// Feed expenses can optionally record the water the calf drank and its cost.
// The water cost is folded into `amount`, so every total/report that sums
// `amount` already includes it; waterCost is kept separately for display.
function validateWater(expenseType: string, waterLiters: unknown, waterCost: unknown): string | null {
  if (expenseType !== "feed") return null
  if (waterLiters && !(Number(waterLiters) >= 0)) return "Enter a valid number of liters of water"
  if (waterCost && !(Number(waterCost) >= 0)) return "Enter a valid water cost"
  return null
}

function waterFields(expenseType: string, waterLiters: unknown, waterCost: unknown) {
  const isFeed = expenseType === "feed"
  return {
    waterLiters: isFeed ? (Number(waterLiters) || null) : null,
    waterCost: isFeed ? (Number(waterCost) || null) : null,
  }
}

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
    if (expenseType) query.expenseType = expenseType
    // Whatever type a vet asks for, they get the veterinary expenses only.
    if (access.via === "grant") query.expenseType = DELEGATE_CALF_EXPENSE_TYPE
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1)
      const pageSize = Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10)

      const total = await db.collection("calf_expenses").countDocuments(query)
      const expenses = await db.collection("calf_expenses")
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray()

      return NextResponse.json({
        expenses: expenses.map(e => ({ ...e, _id: e._id.toString() })),
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      })
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
    const { farmerId, calfId, calfName, expenseType, milkLiters, waterLiters, waterCost, description, amount, date, notes } = body

    if (!farmerId || !calfId || !expenseType || !amount || !date)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    if (!["milk", "feed", "veterinary", "other"].includes(expenseType))
      return NextResponse.json({ error: "Invalid expense type" }, { status: 400 })
    const waterError = validateWater(expenseType, waterLiters, waterCost)
    if (waterError) return NextResponse.json({ error: waterError }, { status: 400 })

    const access = await resolveFarmAccess(currentUser, farmerId, MODULE, "create")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }
    if (access.via === "grant" && expenseType !== DELEGATE_CALF_EXPENSE_TYPE) {
      return NextResponse.json({ error: VET_ONLY_ERROR }, { status: 403 })
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

    const water = waterFields(expenseType, waterLiters, waterCost)
    const record = {
      farmerId, calfId, calfName: calfName || null, expenseType,
      milkLiters: expenseType === "milk" && milkLiters ? Number(milkLiters) : null,
      ...water,
      description: description || null,
      amount: Number(amount) + (water.waterCost || 0),
      date, notes: notes || null,
      createdAt: new Date(),
      ...provenanceFor(currentUser, "create"),
    }

    const result = await db.collection("calf_expenses").insertOne(record)

    if (access.via === "grant") {
      await logVetAction({
        farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "calf_expense.create",
        recordId: result.insertedId.toString(),
        animalId: calfId,
        animalName: calfName || null,
        summary: `${currentUser.name} recorded a veterinary expense of RWF ${record.amount.toLocaleString()}${calfName ? ` for ${calfName}` : ""} (calf)`,
      })
    }

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
    const { id, expenseType, milkLiters, waterLiters, waterCost, description, amount, date, notes } = body
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Expense ID required" }, { status: 400 })
    if (!["milk", "feed", "veterinary", "other"].includes(expenseType))
      return NextResponse.json({ error: "Invalid expense type" }, { status: 400 })
    const waterError = validateWater(expenseType, waterLiters, waterCost)
    if (waterError) return NextResponse.json({ error: waterError }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("calf_expenses").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    // The record's own farmerId decides which farm this is, never one the caller sends.
    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "update", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }
    // Neither side of the edit may be a milk, feed or other expense: a vet can't change
    // the farmer's own costs, nor turn a veterinary expense into one.
    if (access.via === "grant" && (existing.expenseType !== DELEGATE_CALF_EXPENSE_TYPE || expenseType !== DELEGATE_CALF_EXPENSE_TYPE)) {
      return NextResponse.json({ error: VET_ONLY_ERROR }, { status: 403 })
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

    const water = waterFields(expenseType, waterLiters, waterCost)
    const updated = { expenseType, milkLiters: expenseType === "milk" && milkLiters ? Number(milkLiters) : null, ...water, description: description || null, amount: Number(amount) + (water.waterCost || 0), date, notes: notes || null }
    await db.collection("calf_expenses").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updated, ...provenanceFor(currentUser, "update") } }
    )

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "calf_expense.update",
        recordId: id,
        animalId: existing.calfId || null,
        animalName: existing.calfName || null,
        summary: `${currentUser.name} updated a veterinary expense${existing.calfName ? ` for ${existing.calfName}` : ""} (calf)`,
        changes: diffRecord(existing, updated),
      })
    }

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
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Expense ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection("calf_expenses").findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    const access = await resolveFarmAccess(currentUser, existing.farmerId, MODULE, "delete", {
      record: existing as { createdById?: string | null },
    })
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status })
    }
    if (access.via === "grant" && existing.expenseType !== DELEGATE_CALF_EXPENSE_TYPE) {
      return NextResponse.json({ error: VET_ONLY_ERROR }, { status: 403 })
    }

    await db.collection("calf_expenses").deleteOne({ _id: new ObjectId(id) })

    if (access.via === "grant") {
      await logVetAction({
        farmerId: existing.farmerId,
        vetId: currentUser._id,
        vetName: currentUser.name,
        module: MODULE,
        action: "calf_expense.delete",
        recordId: id,
        animalId: existing.calfId || null,
        animalName: existing.calfName || null,
        summary: `${currentUser.name} deleted a veterinary expense${existing.calfName ? ` for ${existing.calfName}` : ""} (calf)`,
      })
    }

    await logActivity(currentUser._id, "livestock.calf_expense_deleted", id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete calf expense" }, { status: 500 })
  }
}
