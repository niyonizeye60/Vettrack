export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    await db.collection("notifications").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { read: true, readAt: new Date() } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ success: false, message: "Failed to mark as read" })
  }
}