export const dynamic = "force-dynamic"

import { getCurrentUser } from "@/lib/actions/auth"
import { getConsultations } from "@/lib/actions"
import { redirect } from "next/navigation"
import clientPromise from "@/lib/db"
import VeterinaryDashboardClient from "./components/veterinary-dashboard-client"

export default async function VeterinaryDashboard() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const consultations = await getConsultations(currentUser._id.toString())
  const pendingConsultations = consultations.filter(c => c.status === "pending")
  const acceptedConsultations = consultations.filter(c => c.status === "accepted")
  const completedCases = consultations.filter(c => c.status === "completed")

  let unreadMessages = 0
  let recentMessages: any[] = []

  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")

    const userConversations = await db.collection("conversations")
      .find({ participants: currentUser._id.toString() })
      .toArray()

    const conversationIds = userConversations.map(conv => conv._id.toString())

    if (conversationIds.length > 0) {
      const allUnreadMessages = await db.collection("messages")
        .find({
          conversationId: { $in: conversationIds },
          senderId: { $ne: currentUser._id.toString() },
          $or: [
            { readBy: { $exists: false } },
            { readBy: { $not: { $elemMatch: { userId: currentUser._id.toString() } } } }
          ]
        })
        .toArray()
      unreadMessages = allUnreadMessages.length
    }

    const conversations = await db.collection("conversations")
      .find({ participants: currentUser._id.toString() })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray()

    for (const conv of conversations) {
      const messages = await db.collection("messages")
        .find({ conversationId: conv._id.toString() })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray()

      if (messages.length > 0) {
        const lastMessage = messages[0]
        const otherUserId = conv.participants.find((p: string) => p !== currentUser._id.toString())
        const otherUser = otherUserId
          ? await db.collection("users").findOne({ _id: { $in: conv.participants.filter((p: string) => p !== currentUser._id.toString()) } })
          : null

        if (otherUser) {
          const isUnread =
            lastMessage.senderId !== currentUser._id.toString() &&
            (!lastMessage.readBy || !lastMessage.readBy.some((r: any) => r.userId === currentUser._id.toString()))

          recentMessages.push({
            id: lastMessage._id.toString(),
            senderName: otherUser.name,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            initials: otherUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            unread: isUnread,
          })
        }
      }
    }

    // Unread conversations first
    recentMessages.sort((a, b) => (b.unread ? 1 : 0) - (a.unread ? 1 : 0))
  } catch (error) {
    console.error('Error fetching messages:', error)
  }

  return (
    <VeterinaryDashboardClient
      currentUser={currentUser}
      consultations={consultations}
      pendingConsultations={pendingConsultations}
      acceptedConsultations={acceptedConsultations}
      completedCases={completedCases}
      unreadMessages={unreadMessages}
      recentMessages={recentMessages}
    />
  )
}
