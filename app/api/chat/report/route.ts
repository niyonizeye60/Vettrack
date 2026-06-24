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

    const { conversationId, reason, messageId } = await request.json()
    if (!conversationId || !reason?.trim()) {
      return NextResponse.json({ error: "conversationId and reason are required" }, { status: 400 })
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

    const result = await db.collection("chat_reports").insertOne({
      conversationId: new ObjectId(conversationId),
      reporterId: new ObjectId(currentUser._id),
      reportedUserId: new ObjectId(otherParticipantId),
      reason: reason.trim(),
      messageId: messageId ? new ObjectId(messageId) : null,
      status: "open",
      createdAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null
    })

    logUserActivity({
      userId: currentUser._id,
      action: "chat.user.reported",
      details: otherParticipantId
    }).catch(() => {})

    return NextResponse.json({ success: true, reportId: result.insertedId.toString() })
  } catch (error) {
    console.error("Error filing report:", error)
    return NextResponse.json({ error: "Failed to file report" }, { status: 500 })
  }
}
