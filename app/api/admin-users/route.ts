export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { registerUser } from "@/lib/actions/auth"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    
    // Admin can only see farmers and doctors, not other admins/superadmins
    const users = await db.collection("users").find({
      role: { $in: ["farmer", "doctor"] }
    }).sort({ createdAt: -1 }).toArray()

    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user
      return {
        ...userWithoutPassword,
        _id: user._id.toString()
      }
    })

    return NextResponse.json({ users: sanitizedUsers })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, password, phone, role, licenseNumber, specialization, district, sector } = body

    // Admin can only create farmers and doctors
    if (!["farmer", "doctor"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Create FormData for registerUser function
    const formData = new FormData()
    formData.append("name", name)
    formData.append("email", email)
    formData.append("password", password)
    formData.append("phone", phone)
    formData.append("role", role)
    
    if (role === "doctor") {
      formData.append("licenseNumber", licenseNumber)
      formData.append("specialization", specialization)
    } else if (role === "farmer") {
      formData.append("district", district)
      formData.append("sector", sector)
    }

    const result = await registerUser(formData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}