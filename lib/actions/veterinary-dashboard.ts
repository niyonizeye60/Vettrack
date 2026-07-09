"use server"

import clientPromise from "@/lib/db"
import { decryptText } from "@/lib/crypto"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/actions/auth"

export async function getRecentMessagesData() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "doctor") {
    return { unreadMessages: 0, recentMessages: [] as any[] }
  }

  let unreadMessages = 0
  let recentMessages: any[] = []

  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const currentUserId = new ObjectId(currentUser._id)
    const currentUserIdStr = currentUserId.toString()

    const visibleConversationsQuery = {
      participants: currentUserId,
      deletedBy: { $nin: [currentUserIdStr] },
      archivedBy: { $nin: [currentUserIdStr] },
    }

    const allConversations = await db.collection("conversations")
      .find(visibleConversationsQuery)
      .toArray()
    const conversationIds = allConversations.map((conv) => conv._id)

    if (conversationIds.length > 0) {
      unreadMessages = await db.collection("messages").countDocuments({
        conversationId: { $in: conversationIds },
        senderId: { $ne: currentUserId },
        readAt: null,
        deletedAt: null,
      })
    }

    // Recent Messages is an unread-activity tray: it only surfaces conversations
    // whose last message is unread, and an entry drops off once that message is
    // read. Scan more than 5 conversations since most recently-active ones may
    // already be read.
    const recentConversations = await db.collection("conversations")
      .find(visibleConversationsQuery)
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .toArray()

    for (const conv of recentConversations) {
      if (recentMessages.length >= 5) break

      const lastMessage = await db.collection("messages")
        .find({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray()

      if (lastMessage.length === 0) continue
      const message = lastMessage[0]

      const isUnread = message.senderId.toString() !== currentUserIdStr && !message.readAt && !message.deletedAt
      if (!isUnread) continue

      const otherParticipantId = (conv.participants as ObjectId[])
        .find((id) => id.toString() !== currentUserIdStr)
      if (!otherParticipantId) continue

      const otherUser = await db.collection("users").findOne(
        { _id: otherParticipantId },
        { projection: { name: 1 } }
      )
      if (!otherUser) continue

      recentMessages.push({
        id: message._id.toString(),
        conversationId: conv._id.toString(),
        senderName: otherUser.name,
        content: decryptText(message.content),
        createdAt: message.createdAt,
        initials: otherUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        unread: true,
      })
    }
  } catch (error) {
    console.error('Error fetching recent messages:', error)
  }

  return { unreadMessages, recentMessages }
}
