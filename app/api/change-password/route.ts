export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const currentUser = JSON.parse(userCookie.value)
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: "Password must be at least 6 characters" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get user with current password
    const user = await db.collection("users").findOne({ _id: new ObjectId(currentUser._id) })
    
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Verify current password (matches superadmin implementation)
    if (currentPassword !== user.password) {
      return NextResponse.json({ success: false, message: "Current password is incorrect" }, { status: 400 })
    }

    // Update password (matches superadmin updateUserPassword function)
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(currentUser._id) },
      { 
        $set: {
          password: newPassword,
          updatedAt: new Date()
        }
      }
    )

    if (result.modifiedCount > 0) {
      return NextResponse.json({ success: true, message: "Password changed successfully" })
    }

    return NextResponse.json({ success: false, message: "Failed to update password" })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json({ success: false, message: "Failed to change password" }, { status: 500 })
  }
}