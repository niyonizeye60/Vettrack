export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== "farmer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const farmerId = currentUser._id.toString()
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const [totalAnimals, healthyAnimals, totalConsultations] = await Promise.all([
      db.collection("animals").countDocuments({ ownerId: farmerId }),
      db.collection("animals").countDocuments({ ownerId: farmerId, status: "Healthy" }),
      db.collection("consultations").countDocuments({ farmerId }),
    ])

    return NextResponse.json({ totalAnimals, healthyAnimals, totalConsultations })
  } catch (error) {
    console.error("Error fetching farmer stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
