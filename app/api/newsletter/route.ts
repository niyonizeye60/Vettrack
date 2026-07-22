export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/auth"

const DB = "ntdm_animal_hospital"
const COLLECTION = "newsletter_subscribers"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, message: "Valid email is required" }, { status: 400 })
    }
    const emailLower = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json({ success: false, message: "Invalid email address" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const existing = await db.collection(COLLECTION).findOne({ email: emailLower })
    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json({ success: false, message: "This email is already subscribed" }, { status: 409 })
      }
      await db.collection(COLLECTION).updateOne(
        { _id: existing._id },
        { $set: { status: "active", resubscribedAt: new Date() } }
      )
      return NextResponse.json({ success: true, message: "Successfully resubscribed!" })
    }

    await db.collection(COLLECTION).insertOne({
      email: emailLower,
      status: "active",
      subscribedAt: new Date(),
    })

    return NextResponse.json({ success: true, message: "Successfully subscribed!" })
  } catch {
    return NextResponse.json({ success: false, message: "Failed to subscribe" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DB)

    const subscribers = await db
      .collection(COLLECTION)
      .find({})
      .sort({ subscribedAt: -1 })
      .toArray()

    return NextResponse.json(
      subscribers.map((s) => ({ ...s, _id: s._id.toString() }))
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Subscriber ID required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db(DB)

    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to remove subscriber" }, { status: 500 })
  }
}
