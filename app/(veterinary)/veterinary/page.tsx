export const dynamic = "force-dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Stethoscope, Heart, ClipboardCheck, Mail, Clock, User, Phone } from "lucide-react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getConsultations } from "@/lib/actions"
import { redirect } from "next/navigation"
import clientPromise from "@/lib/db"
import VeterinaryDashboardClient from "./components/veterinary-dashboard-client"

export default async function VeterinaryDashboard() {
  const currentUser = await getCurrentUser()
  
  // Redirect if not logged in or not a doctor
  if (!currentUser || currentUser.role !== "doctor") {
    redirect("/login")
  }

  const consultations = await getConsultations(currentUser._id.toString())
  const pendingConsultations = consultations.filter(c => c.status === "pending")
  const completedCases = consultations.filter(c => c.status === "completed")
  const recentAppointments = consultations.slice(0, 2)

  // Get unread messages count
  let unreadMessages = 0
  let recentMessages: any[] = []
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    
    // Get conversations where current user is a participant
    const userConversations = await db.collection("conversations")
      .find({ participants: currentUser._id.toString() })
      .toArray()
    
    const conversationIds = userConversations.map(conv => conv._id.toString())
    
    // Count unread messages from other users in user's conversations only
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
    
    // Get recent conversations for recent messages
    const conversations = await db.collection("conversations")
      .find({ participants: currentUser._id.toString() })
      .sort({ updatedAt: -1 })
      .limit(3)
      .toArray()
    
    for (const conv of conversations) {
      const messages = await db.collection("messages")
        .find({ conversationId: conv._id.toString() })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray()
      
      if (messages.length > 0) {
        const lastMessage = messages[0]
        
        const otherUser = await db.collection("users")
          .findOne({ _id: { $in: conv.participants.filter((p: string) => p !== currentUser._id.toString()) } })
        
        if (otherUser) {
          recentMessages.push({
            id: lastMessage._id.toString(),
            senderName: otherUser.name,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            initials: otherUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
          })
        }
      }
    }
  } catch (error) {
    console.error('Error fetching messages:', error)
  }

  return (
    <VeterinaryDashboardClient 
      currentUser={currentUser}
      consultations={consultations}
      pendingConsultations={pendingConsultations}
      completedCases={completedCases}
      recentAppointments={recentAppointments}
      unreadMessages={unreadMessages}
      recentMessages={recentMessages}
    />
  )
}