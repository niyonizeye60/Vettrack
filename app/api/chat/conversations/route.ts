export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { logUserActivity } from "@/lib/actions/superadmin"
import { decryptText } from "@/lib/crypto"
import { isPresenceOnline } from "@/lib/presence"
import { ObjectId } from "mongodb"

function isBlockedPair(conversation: any, idA: string, idB: string): boolean {
  const blockedBy = conversation.blockedBy || []
  return blockedBy.some(
    (b: any) =>
      (b.blockerId === idA && b.blockedId === idB) ||
      (b.blockerId === idB && b.blockedId === idA)
  )
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Get conversations where current user is a participant
    const query: any = {
      participants: new ObjectId(currentUser._id),
      deletedBy: { $nin: [currentUser._id] }
    }
    if (!includeArchived) {
      query.archivedBy = { $nin: [currentUser._id] }
    } else {
      query.archivedBy = currentUser._id
    }

    const conversations = await db.collection("conversations").find(query)
      .sort({ lastMessageAt: -1 }).toArray()

    // Get participant details and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        // Get the other participant (not current user)
        const otherParticipantId = conv.participants.find(
          (id: ObjectId) => id.toString() !== currentUser._id
        )

        // These four lookups are independent of each other, so run them
        // concurrently instead of paying four sequential round-trips per
        // conversation (conversations already run concurrently with each
        // other via the outer Promise.all - this parallelizes within each
        // one too).
        const [otherUser, lastMessage, unreadCount, otherPresence] = await Promise.all([
          db.collection("users").findOne(
            { _id: otherParticipantId },
            { projection: { name: 1, role: 1, image: 1 } }
          ),
          db.collection("messages").findOne(
            { conversationId: conv._id },
            { sort: { createdAt: -1 } }
          ),
          // Count unread messages - deleted messages have no content to
          // surface, so they shouldn't inflate the unread badge.
          db.collection("messages").countDocuments({
            conversationId: conv._id,
            senderId: { $ne: new ObjectId(currentUser._id) },
            readAt: null,
            deletedAt: null
          }),
          otherParticipantId
            ? db.collection("presence").findOne({ _id: otherParticipantId } as any)
            : Promise.resolve(null)
        ])
        const isOnline = isPresenceOnline(otherPresence as any)

        return {
          id: conv._id.toString(),
          otherUser: {
            id: otherUser?._id.toString(),
            name: otherUser?.name,
            role: otherUser?.role,
            image: otherUser?.image ?? null,
            isOnline
          },
          lastMessage: lastMessage ? {
            content: lastMessage.deletedAt ? "" : decryptText(lastMessage.content),
            isDeleted: !!lastMessage.deletedAt,
            createdAt: lastMessage.createdAt
          } : null,
          unreadCount,
          updatedAt: conv.lastMessageAt || conv.createdAt,
          isArchived: (conv.archivedBy || []).includes(currentUser._id),
          isBlocked: otherParticipantId
            ? isBlockedPair(conv, currentUser._id, otherParticipantId.toString())
            : false
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithDetails })
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { participantId } = await request.json()

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Check if conversation already exists
    const existingConversation = await db.collection("conversations").findOne({
      participants: {
        $all: [new ObjectId(currentUser._id), new ObjectId(participantId)]
      }
    })

    if (existingConversation) {
      if (isBlockedPair(existingConversation, currentUser._id, participantId)) {
        return NextResponse.json({ error: "Cannot start conversation - user is blocked" }, { status: 403 })
      }
      // Unarchive/un-remove for the current user if they previously archived or removed it
      if (
        (existingConversation.archivedBy || []).includes(currentUser._id) ||
        (existingConversation.deletedBy || []).includes(currentUser._id)
      ) {
        await db.collection("conversations").updateOne(
          { _id: existingConversation._id },
          { $pull: { archivedBy: currentUser._id, deletedBy: currentUser._id } } as any
        )
      }
      return NextResponse.json({ conversationId: existingConversation._id.toString() })
    }

    // Create new conversation. expiresAt drives a TTL index that auto-removes this
    // conversation if no message is ever sent in it within 60s (see messages POST,
    // which clears expiresAt as soon as a first message lands).
    const newConversation = {
      participants: [new ObjectId(currentUser._id), new ObjectId(participantId)],
      createdAt: new Date(),
      lastMessageAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 1000),
      archivedBy: [] as string[],
      deletedBy: [] as string[],
      blockedBy: [] as { blockerId: string; blockedId: string; createdAt: Date }[]
    }

    const result = await db.collection("conversations").insertOne(newConversation)

    return NextResponse.json({ conversationId: result.insertedId.toString() })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, action } = await request.json()
    if (!conversationId || !["archive", "unarchive"].includes(action)) {
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

    if (action === "archive") {
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(conversationId) },
        { $addToSet: { archivedBy: currentUser._id } }
      )
    } else {
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(conversationId) },
        { $pull: { archivedBy: currentUser._id } } as any
      )
    }

    logUserActivity({
      userId: currentUser._id,
      action: action === "archive" ? "chat.conversation.archived" : "chat.conversation.unarchived",
      details: conversationId
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating conversation:", error)
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
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

    // Per-user removal - hides it from this user's chat list only. It reappears
    // automatically if a new message arrives (see messages POST) or if the user
    // starts a new conversation with the same person (see conversations POST).
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      { $addToSet: { deletedBy: currentUser._id } }
    )

    logUserActivity({
      userId: currentUser._id,
      action: "chat.conversation.removed",
      details: conversationId
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing conversation:", error)
    return NextResponse.json({ error: "Failed to remove conversation" }, { status: 500 })
  }
}
