export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("presence").updateOne(
      { _id: new ObjectId(currentUser._id) } as any,
      { $set: { lastActiveAt: new Date(), lastActiveRole: currentUser.role, isOnline: true } },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error recording presence:", error)
    return NextResponse.json({ error: "Failed to record presence" }, { status: 500 })
  }
}
