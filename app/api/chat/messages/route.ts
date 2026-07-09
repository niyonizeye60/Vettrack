export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { logUserActivity } from "@/lib/actions/superadmin"
import { encryptText, decryptText } from "@/lib/crypto"
import { ObjectId } from "mongodb"

const ONLINE_THRESHOLD_MS = 60 * 1000
const EDIT_WINDOW_MS = 15 * 60 * 1000

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
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Verify user is participant in conversation
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

    const messages = await db.collection("messages").find({
      conversationId: new ObjectId(conversationId)
    }).sort({ createdAt: 1 }).toArray()

    // Mark messages as read
    await db.collection("messages").updateMany(
      {
        conversationId: new ObjectId(conversationId),
        senderId: { $ne: new ObjectId(currentUser._id) },
        readAt: null
      },
      { $set: { readAt: new Date() } }
    )
    const readNow = new Date()

    // Presence of the other participant - drives "delivered" + online badge
    const otherPresence = otherParticipantId
      ? await db.collection("presence").findOne({ _id: new ObjectId(otherParticipantId) } as any)
      : null
    const otherLastActiveAt: Date | null = otherPresence?.lastActiveAt || null
    const otherIsOnline = otherLastActiveAt
      ? Date.now() - new Date(otherLastActiveAt).getTime() < ONLINE_THRESHOLD_MS
      : false

    // Typing indicator from the other participant
    const now = new Date()
    let typingUsers: string[] = []
    if (otherParticipantId) {
      const typingDoc = await db.collection("typing_indicators").findOne({
        conversationId: new ObjectId(conversationId),
        userId: new ObjectId(otherParticipantId),
        expiresAt: { $gt: now }
      })
      if (typingDoc) typingUsers = [otherParticipantId]
    }

    const formattedMessages = messages.map(msg => {
      const isMe = msg.senderId.toString() === currentUser._id
      const isDeleted = !!msg.deletedAt
      let status: "sent" | "delivered" | "read" = "sent"
      if (isMe) {
        if (msg.readAt) {
          status = "read"
        } else if (otherLastActiveAt && new Date(otherLastActiveAt) >= msg.createdAt) {
          status = "delivered"
        }
      }
      return {
        id: msg._id.toString(),
        content: isDeleted ? "" : decryptText(msg.content),
        senderId: msg.senderId.toString(),
        isMe,
        isDeleted,
        createdAt: msg.createdAt,
        readAt: msg.readAt || (!isMe ? readNow : null),
        editedAt: msg.editedAt || null,
        status
      }
    })

    return NextResponse.json({
      messages: formattedMessages,
      otherUserPresence: { isOnline: otherIsOnline, lastActiveAt: otherLastActiveAt },
      typingUsers
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, content } = await request.json()

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: "Conversation ID and content required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Verify user is participant in conversation
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

    if (otherParticipantId && isBlockedPair(conversation, currentUser._id, otherParticipantId)) {
      return NextResponse.json({ error: "Cannot send message - blocked" }, { status: 403 })
    }

    const trimmedContent = content.trim()

    // Create message
    const newMessage = {
      conversationId: new ObjectId(conversationId),
      senderId: new ObjectId(currentUser._id),
      content: encryptText(trimmedContent),
      createdAt: new Date(),
      readAt: null,
      editedAt: null,
      deletedAt: null,
      deletedBy: null as string | null
    }

    const result = await db.collection("messages").insertOne(newMessage)

    // Update conversation last message time, cancel its empty-conversation TTL
    // expiry (see conversations POST) now that it has a real message in it, and
    // restore visibility for anyone who had removed it from their chat list -
    // new activity should bring a conversation back into view.
    const participantIds = [currentUser._id, otherParticipantId].filter(Boolean) as string[]
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: { lastMessageAt: new Date() },
        $unset: { expiresAt: "" },
        $pull: { deletedBy: { $in: participantIds } }
      } as any
    )

    logUserActivity({
      userId: currentUser._id,
      action: "chat.message.sent",
      details: conversationId
    }).catch(() => {})

    if (otherParticipantId) {
      const recipientRole = currentUser.role === "farmer" ? "doctor" : "farmer"
      const dashboardSegment = recipientRole === "doctor" ? "veterinary" : "farmer"
      db.collection("notifications").insertOne({
        title: `New message from ${currentUser.name}`,
        message: trimmedContent.slice(0, 80),
        type: "chat",
        priority: "normal",
        read: false,
        deletedBy: [],
        userId: new ObjectId(otherParticipantId),
        actionUrl: `/${dashboardSegment}/messages?conversationId=${conversationId}`,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        createdAt: new Date()
      }).catch((err) => console.error("Error inserting chat notification:", err))
    }

    return NextResponse.json({
      messageId: result.insertedId.toString(),
      message: {
        id: result.insertedId.toString(),
        content: trimmedContent,
        senderId: currentUser._id,
        isMe: true,
        createdAt: newMessage.createdAt,
        readAt: null,
        editedAt: null,
        status: "sent"
      }
    })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageId, content } = await request.json()
    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: "Message ID and content required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const message = await db.collection("messages").findOne({ _id: new ObjectId(messageId) })
    if (!message || message.senderId.toString() !== currentUser._id) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
      return NextResponse.json({ error: "Edit window has expired" }, { status: 403 })
    }

    const trimmedContent = content.trim()
    const editedAt = new Date()

    await db.collection("messages").updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { content: encryptText(trimmedContent), editedAt } }
    )

    logUserActivity({
      userId: currentUser._id,
      action: "chat.message.edited",
      details: messageId
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        content: trimmedContent,
        senderId: currentUser._id,
        isMe: true,
        createdAt: message.createdAt,
        readAt: message.readAt || null,
        editedAt,
        status: message.readAt ? "read" : "sent"
      }
    })
  } catch (error) {
    console.error("Error editing message:", error)
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    // Only the sender can delete their own message, and it's deleted for
    // everyone in the conversation (not just the caller).
    const message = await db.collection("messages").findOne({ _id: new ObjectId(messageId) })
    if (!message || message.senderId.toString() !== currentUser._id) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    await db.collection("messages").updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { deletedAt: new Date(), deletedBy: currentUser._id } }
    )

    logUserActivity({
      userId: currentUser._id,
      action: "chat.message.deleted",
      details: messageId
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting message:", error)
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
  }
}
