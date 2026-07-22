export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { decryptText } from "@/lib/crypto"
import { ObjectId } from "mongodb"

const MAX_RESULTS = 50

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    if (!q) {
      return NextResponse.json({ results: [] })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Scope strictly to the caller's own conversations
    const conversations = await db.collection("conversations").find({
      participants: new ObjectId(currentUser._id)
    }).toArray()

    if (conversations.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const conversationIds = conversations.map((c) => c._id)
    const otherUserByConversation = new Map<string, ObjectId>()
    conversations.forEach((c) => {
      const other = (c.participants as ObjectId[]).find((id) => id.toString() !== currentUser._id)
      if (other) otherUserByConversation.set(c._id.toString(), other)
    })

    const otherUserIds = Array.from(otherUserByConversation.values())
    const users = await db.collection("users").find(
      { _id: { $in: otherUserIds } },
      { projection: { name: 1 } }
    ).toArray()
    const nameById = new Map(users.map((u) => [u._id.toString(), u.name as string]))

    const messages = await db.collection("messages").find({
      conversationId: { $in: conversationIds },
      deletedAt: null
    }).sort({ createdAt: -1 }).toArray()

    const results: Array<{ messageId: string; conversationId: string; content: string; createdAt: Date; otherUserName: string }> = []
    for (const msg of messages) {
      const plain = decryptText(msg.content)
      if (plain.toLowerCase().includes(q)) {
        const convId = msg.conversationId.toString()
        const otherId = otherUserByConversation.get(convId)?.toString()
        results.push({
          messageId: msg._id.toString(),
          conversationId: convId,
          content: plain,
          createdAt: msg.createdAt,
          otherUserName: (otherId && nameById.get(otherId)) || "Unknown"
        })
        if (results.length >= MAX_RESULTS) break
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error searching messages:", error)
    return NextResponse.json({ error: "Failed to search messages" }, { status: 500 })
  }
}
