export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"
import { hashPassword } from "@/lib/password"

const ALLOWED_FIELDS = ["name", "email", "phone", "password", "licenseNumber", "specialization", "bio"] as const

async function updateProfile(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const updateData: Record<string, any> = {}
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined && body[field] !== "") {
        updateData[field] = body[field]
      }
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    if (updateData.email) {
      const existing = await db.collection("users").findOne({
        email: updateData.email,
        _id: { $ne: new ObjectId(currentUser._id) },
      })
      if (existing) {
        return NextResponse.json({ success: false, message: "Email already in use" }, { status: 400 })
      }
    }

    if (updateData.password) {
      if (updateData.password.length < 6) {
        return NextResponse.json({ success: false, message: "Password must be at least 6 characters" }, { status: 400 })
      }
      updateData.password = await hashPassword(updateData.password)
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(currentUser._id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 })
  }
}

export const PATCH = updateProfile
export const PUT = updateProfile
