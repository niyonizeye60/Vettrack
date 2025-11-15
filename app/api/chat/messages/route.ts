export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"

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

    // Get messages
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

    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      content: msg.content,
      senderId: msg.senderId.toString(),
      isMe: msg.senderId.toString() === currentUser._id,
      createdAt: msg.createdAt,
      readAt: msg.readAt
    }))

    return NextResponse.json({ messages: formattedMessages })
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

    // Create message
    const newMessage = {
      conversationId: new ObjectId(conversationId),
      senderId: new ObjectId(currentUser._id),
      content: content.trim(),
      createdAt: new Date(),
      readAt: null
    }

    const result = await db.collection("messages").insertOne(newMessage)

    // Update conversation last message time
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { lastMessageAt: new Date() } }
    )

    return NextResponse.json({ 
      messageId: result.insertedId.toString(),
      message: {
        id: result.insertedId.toString(),
        content: newMessage.content,
        senderId: currentUser._id,
        isMe: true,
        createdAt: newMessage.createdAt,
        readAt: null
      }
    })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}