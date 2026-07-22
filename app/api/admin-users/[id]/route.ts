export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { logUserActivity } from "@/lib/actions/superadmin"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== "admin" || !ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Admin can only look up farmers and doctors, not other admins/superadmins
    const user = await db.collection("users").findOne({
      _id: new ObjectId(params.id),
      role: { $in: ["farmer", "doctor"] },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { password, ...userWithoutPassword } = user
    return NextResponse.json({ user: { ...userWithoutPassword, _id: user._id.toString() } })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const body = await request.json()
    const { action, ...updateData } = body

    if (action === "suspend" || action === "activate") {
      const newStatus = action === "suspend" ? "suspended" : "active"
      const targetUser = await db.collection("users").findOne({ _id: new ObjectId(params.id) }, { projection: { name: 1 } })

      await db.collection("users").updateOne(
        { _id: new ObjectId(params.id) },
        { $set: { status: newStatus, updatedAt: new Date() } }
      )

      await logUserActivity({
        userId: currentUser._id,
        action: action === "suspend" ? "admin.user.suspended" : "admin.user.activated",
        details: targetUser?.name || params.id,
      })

      return NextResponse.json({ success: true, message: `User ${action}d successfully` })
    }

    if (action === "approve" || action === "reject") {
      const newStatus = action === "approve" ? "active" : "rejected"
      const targetUser = await db.collection("users").findOne({ _id: new ObjectId(params.id) }, { projection: { name: 1 } })

      await db.collection("users").updateOne(
        { _id: new ObjectId(params.id), role: "doctor", status: "pending_verification" },
        { $set: { status: newStatus, updatedAt: new Date() } }
      )

      await logUserActivity({
        userId: currentUser._id,
        action: action === "approve" ? "admin.vet.approved" : "admin.vet.rejected",
        details: targetUser?.name || params.id,
      })

      return NextResponse.json({ success: true, message: `Veterinarian ${action}d successfully` })
    }

    // Regular update
    await db.collection("users").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true, message: "User updated successfully" })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}