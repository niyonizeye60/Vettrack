export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

// Hit via navigator.sendBeacon on tab close/refresh (see PresenceHeartbeat) so
// presence flips to offline immediately instead of waiting up to
// ONLINE_THRESHOLD_MS for the heartbeat to go stale.
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
      { $set: { isOnline: false } },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking presence offline:", error)
    return NextResponse.json({ error: "Failed to mark offline" }, { status: 500 })
  }
}
