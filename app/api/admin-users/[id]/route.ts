export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

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
      
      await db.collection("users").updateOne(
        { _id: new ObjectId(params.id) },
        { $set: { status: newStatus, updatedAt: new Date() } }
      )
      
      return NextResponse.json({ success: true, message: `User ${action}d successfully` })
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