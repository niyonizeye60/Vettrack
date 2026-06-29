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
    const cowId = searchParams.get("cowId")
    const session = searchParams.get("session")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const month = searchParams.get("month")

    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const query: any = { farmerId }
    if (cowId) query.cowId = cowId
    if (session) query.session = session
    if (month) {
      const [year, m] = month.split("-")
      const start = new Date(Number(year), Number(m) - 1, 1).toISOString().split("T")[0]
      const end = new Date(Number(year), Number(m), 1).toISOString().split("T")[0]
      query.date = { $gte: start, $lt: end }
    } else if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    const records = await db.collection("milk_records").find(query).sort({ date: -1, createdAt: -1 }).toArray()
    return NextResponse.json(records.map(r => ({ ...r, _id: r._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch milk records" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, cowId, cowName, liters, homeConsumption, soldLiters, pricePerLiter, totalAmount, session, date, time, waterLiters, foodType, foodKg, foodCost, notes } = body

    if (!farmerId || !cowId || !liters || !session || !date)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const record = {
      farmerId, cowId, cowName,
      liters: Number(liters),
      homeConsumption: homeConsumption ? Number(homeConsumption) : null,
      soldLiters: soldLiters != null ? Number(soldLiters) : null,
      pricePerLiter: pricePerLiter ? Number(pricePerLiter) : null,
      totalAmount: totalAmount ? Number(totalAmount) : null,
      session, date,
      time: time || null,
      waterLiters: waterLiters ? Number(waterLiters) : null,
      foodType: foodType || null,
      foodKg: foodKg ? Number(foodKg) : null,
      foodCost: foodCost ? Number(foodCost) : null,
      notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("milk_records").insertOne(record)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save milk record" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, liters, homeConsumption, soldLiters, pricePerLiter, totalAmount, session, date, time, waterLiters, foodType, foodKg, foodCost, notes } = body
    if (!id) return NextResponse.json({ error: "Record ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("milk_records").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("milk_records").updateOne(
      { _id: new ObjectId(id) },
      { $set: { liters: Number(liters), homeConsumption: homeConsumption ? Number(homeConsumption) : null, soldLiters: soldLiters != null ? Number(soldLiters) : null, pricePerLiter: pricePerLiter ? Number(pricePerLiter) : null, totalAmount: totalAmount ? Number(totalAmount) : null, session, date, time, waterLiters: waterLiters ? Number(waterLiters) : null, foodType: foodType || null, foodKg: foodKg ? Number(foodKg) : null, foodCost: foodCost ? Number(foodCost) : null, notes, updatedAt: new Date() } }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update milk record" }, { status: 500 })
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
      const existing = await db.collection("milk_records").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("milk_records").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete milk record" }, { status: 500 })
  }
}
