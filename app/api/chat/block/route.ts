export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { logUserActivity } from "@/lib/actions/superadmin"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, action } = await request.json()
    if (!conversationId || !["block", "unblock"].includes(action)) {
      return NextResponse.json({ error: "conversationId and a valid action are required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(conversationId),
      participants: new ObjectId(currentUser._id)
    })
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const otherParticipantId = (conversation.participants as ObjectId[])
      .find((id) => id.toString() !== currentUser._id)
      ?.toString()
    if (!otherParticipantId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const blockedBy = conversation.blockedBy || []
    const alreadyBlocked = blockedBy.some(
      (b: any) => b.blockerId === currentUser._id && b.blockedId === otherParticipantId
    )

    if (action === "block") {
      if (!alreadyBlocked) {
        await db.collection("conversations").updateOne(
          { _id: new ObjectId(conversationId) },
          { $push: { blockedBy: { blockerId: currentUser._id, blockedId: otherParticipantId, createdAt: new Date() } } } as any
        )
      }
    } else {
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(conversationId) },
        { $pull: { blockedBy: { blockerId: currentUser._id, blockedId: otherParticipantId } } } as any
      )
    }

    logUserActivity({
      userId: currentUser._id,
      action: action === "block" ? "chat.user.blocked" : "chat.user.unblocked",
      details: otherParticipantId
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating block state:", error)
    return NextResponse.json({ error: "Failed to update block state" }, { status: 500 })
  }
}
