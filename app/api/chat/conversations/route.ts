export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || !["farmer", "doctor"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    
    // Get conversations where current user is a participant
    const conversations = await db.collection("conversations").find({
      participants: new ObjectId(currentUser._id)
    }).sort({ lastMessageAt: -1 }).toArray()

    // Get participant details and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        // Get the other participant (not current user)
        const otherParticipantId = conv.participants.find(
          (id: ObjectId) => id.toString() !== currentUser._id
        )
        
        const otherUser = await db.collection("users").findOne(
          { _id: otherParticipantId },
          { projection: { name: 1, role: 1 } }
        )

        // Get last message
        const lastMessage = await db.collection("messages").findOne(
          { conversationId: conv._id },
          { sort: { createdAt: -1 } }
        )

        // Count unread messages
        const unreadCount = await db.collection("messages").countDocuments({
          conversationId: conv._id,
          senderId: { $ne: new ObjectId(currentUser._id) },
          readAt: null
        })

        return {
          id: conv._id.toString(),
          otherUser: {
            id: otherUser?._id.toString(),
            name: otherUser?.name,
            role: otherUser?.role
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt
          } : null,
          unreadCount,
          updatedAt: conv.lastMessageAt || conv.createdAt
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
      return NextResponse.json({ conversationId: existingConversation._id.toString() })
    }

    // Create new conversation
    const newConversation = {
      participants: [new ObjectId(currentUser._id), new ObjectId(participantId)],
      createdAt: new Date(),
      lastMessageAt: new Date()
    }

    const result = await db.collection("conversations").insertOne(newConversation)
    
    return NextResponse.json({ conversationId: result.insertedId.toString() })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }
}