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
    const employeeId = searchParams.get("employeeId")
    const month = searchParams.get("month")

    if (!farmerId) return NextResponse.json({ error: "farmerId required" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const query: any = { farmerId }
    if (employeeId) query.employeeId = employeeId
    if (month) query.paymentDate = { $gte: `${month}-01`, $lt: `${month}-32` }

    const payments = await db.collection("employee_payments").find(query).sort({ paymentDate: -1, createdAt: -1 }).toArray()
    return NextResponse.json(payments.map(p => ({ ...p, _id: p._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, employeeId, employeeName, amount, paymentDate, period, method, notes } = body

    if (!farmerId || !employeeId || !amount || !paymentDate || !method)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const payment = {
      farmerId, employeeId, employeeName,
      amount: Number(amount),
      paymentDate,
      period: period || null,
      method,
      notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("employee_payments").insertOne(payment)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save payment" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, amount, paymentDate, period, method, notes } = body
    if (!id) return NextResponse.json({ error: "Payment ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("employee_payments").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("employee_payments").updateOne(
      { _id: new ObjectId(id) },
      { $set: { amount: Number(amount), paymentDate, period: period || null, method, notes: notes || null, updatedAt: new Date() } }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
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
    if (!id) return NextResponse.json({ error: "Payment ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("employee_payments").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("employee_payments").deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 })
  }
}
