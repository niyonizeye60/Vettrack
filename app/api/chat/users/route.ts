export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
   
    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
   
    // Get users of opposite role (farmers can chat with doctors, doctors with farmers)
    const targetRole = currentUser.role === "farmer" ? "doctor" : "farmer"
   
    const users = await db.collection("users").find(
      {
        role: targetRole,
        status: { $nin: ["suspended", "inactive"] },
        _id: { $ne: new ObjectId(currentUser._id) }
      },
      {
        projection: {
          name: 1,
          role: 1,
          specialization: 1,
          district: 1,
          sector: 1,
          image: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          bio: 1,
          availability: 1
        }
      }
    ).toArray()

    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      specialization: user.specialization,
      location: user.district && user.sector ? `${user.district}, ${user.sector}` : null,
      image: user.image ?? null,
      email: user.email,
      phone: user.phone,
      licenseNumber: user.licenseNumber,
      bio: user.bio,
      availability: user.availability
    }))
    
    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("Error fetching chat users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}