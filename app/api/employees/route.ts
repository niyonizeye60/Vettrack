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

    const employees = await db.collection("employees").find({ farmerId }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(employees.map(e => ({ ...e, _id: e._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { farmerId, name, position, phone, nationalId, hireDate, wageType, wageAmount, status, notes } = body

    if (!farmerId || !name || !position || !wageType || !wageAmount)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff && farmerId !== currentUser._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const employee = {
      farmerId, name, position,
      phone: phone || null,
      nationalId: nationalId || null,
      hireDate: hireDate || null,
      wageType,
      wageAmount: Number(wageAmount),
      status: status || "active",
      notes: notes || null,
      createdAt: new Date(),
    }

    const result = await db.collection("employees").insertOne(employee)
    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save employee" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, position, phone, nationalId, hireDate, wageType, wageAmount, status, notes } = body
    if (!id) return NextResponse.json({ error: "Employee ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("employees").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("employees").updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, position, phone: phone || null, nationalId: nationalId || null, hireDate: hireDate || null, wageType, wageAmount: Number(wageAmount), status, notes: notes || null, updatedAt: new Date() } }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
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
    if (!id) return NextResponse.json({ error: "Employee ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    const isStaff = ["admin", "superadmin"].includes(currentUser.role)
    if (!isStaff) {
      const existing = await db.collection("employees").findOne({ _id: new ObjectId(id) })
      if (!existing || existing.farmerId !== currentUser._id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    await db.collection("employees").deleteOne({ _id: new ObjectId(id) })
    await db.collection("employee_payments").deleteMany({ employeeId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
