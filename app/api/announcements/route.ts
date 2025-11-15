export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const announcements = await db.collection("announcements")
      .find({ active: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    const formattedAnnouncements = announcements.map(a => ({
      _id: a._id.toString(),
      title: a.title,
      content: a.content,
      type: a.type,
      priority: a.priority,
      createdAt: a.createdAt
    }))

    return NextResponse.json({ success: true, announcements: formattedAnnouncements })
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch announcements" })
  }
}