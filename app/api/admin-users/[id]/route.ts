export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { logUserActivity } from "@/lib/actions/superadmin"
import { hashPassword } from "@/lib/password"
import { ObjectId } from "mongodb"

const EDITABLE_FIELDS = ["name", "email", "phone", "district", "sector", "licenseNumber", "specialization"] as const
// Admin manages farmers and doctors only - every write below is scoped to this filter
// so a regional admin can never touch another admin/superadmin account.
const MANAGED_ROLES = { $in: ["farmer", "doctor"] }

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
      const targetUser = await db.collection("users").findOne({ _id: new ObjectId(params.id), role: MANAGED_ROLES }, { projection: { name: 1 } })

      await db.collection("users").updateOne(
        { _id: new ObjectId(params.id), role: MANAGED_ROLES },
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

    if (action === "resetPassword") {
      const { password } = updateData
      if (!password || typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
      }

      const targetUser = await db.collection("users").findOne({ _id: new ObjectId(params.id), role: MANAGED_ROLES }, { projection: { name: 1 } })
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      await db.collection("users").updateOne(
        { _id: new ObjectId(params.id), role: MANAGED_ROLES },
        { $set: { password: await hashPassword(password), updatedAt: new Date() } }
      )

      await logUserActivity({
        userId: currentUser._id,
        action: "admin.user.passwordReset",
        details: targetUser.name,
      })

      return NextResponse.json({ success: true, message: "Password updated successfully" })
    }

    // Regular update - only known profile fields, never password (use action: "resetPassword" for that)
    const fields: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (updateData[field] !== undefined) fields[field] = updateData[field]
    }

    if (fields.email) {
      const existing = await db.collection("users").findOne({
        email: fields.email,
        _id: { $ne: new ObjectId(params.id) },
      })
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 })
      }
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(params.id), role: MANAGED_ROLES },
      { $set: { ...fields, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "User updated successfully" })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}