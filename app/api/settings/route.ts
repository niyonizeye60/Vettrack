export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { cookies } from "next/headers"

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const currentUser = JSON.parse(userCookie.value)
    const { settings } = await request.json()

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(currentUser._id) },
      { 
        $set: {
          settings,
          updatedAt: new Date()
        }
      }
    )

    if (result.modifiedCount > 0) {
      return NextResponse.json({ success: true, message: "Settings updated successfully" })
    }

    return NextResponse.json({ success: false, message: "No changes made" })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ success: false, message: "Failed to update settings" }, { status: 500 })
  }
}