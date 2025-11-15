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
    const updateData = await request.json()

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(currentUser._id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    )

    if (result.modifiedCount > 0) {
      const updatedUser = { ...currentUser, ...updateData }
      const response = NextResponse.json({ success: true, message: "Profile updated successfully" })
      response.cookies.set('user', JSON.stringify(updatedUser), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60
      })
      return response
    }

    return NextResponse.json({ success: false, message: "No changes made" })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 })
  }
}