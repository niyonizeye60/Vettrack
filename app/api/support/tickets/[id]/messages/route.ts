export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { encryptText } from "@/lib/crypto"
import { ObjectId } from "mongodb"

const DB = "ntdm_animal_hospital"
const STAFF_ROLES = ["admin", "superadmin"]

// POST: reply on a ticket. Either the requester (farmer/doctor who opened it)
// or staff (admin/superadmin). A staff reply auto-claims an unassigned
// ticket; a requester reply reopens a resolved ticket.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content } = await request.json()
    const trimmed = (content || "").toString().trim()
    if (!trimmed) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB)
    const ticketId = new ObjectId(params.id)

    const ticket = await db.collection("supportTickets").findOne({ _id: ticketId })
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    const isRequester = ticket.requesterId === currentUser._id
    const isStaff = STAFF_ROLES.includes(currentUser.role)
    if (!isRequester && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const now = new Date()
    await db.collection("supportMessages").insertOne({
      ticketId,
      senderId: currentUser._id,
      senderRole: currentUser.role,
      senderName: currentUser.name,
      content: encryptText(trimmed),
      createdAt: now,
    })

    const ticketUpdate: Record<string, any> = {
      updatedAt: now,
      lastMessageAt: now,
    }

    if (isStaff) {
      ticketUpdate.unreadByRequester = true
      ticketUpdate.unreadByAdmin = false
      if (!ticket.assignedTo) {
        ticketUpdate.assignedTo = currentUser._id
        ticketUpdate.assignedToName = currentUser.name
      }
      if (ticket.status === "open") {
        ticketUpdate.status = "in_progress"
      }
    } else {
      ticketUpdate.unreadByAdmin = true
      ticketUpdate.unreadByRequester = false
      if (ticket.status === "resolved") {
        ticketUpdate.status = "open"
      }
    }

    await db.collection("supportTickets").updateOne({ _id: ticketId }, { $set: ticketUpdate })

    // Notify the requester when an admin replies - the requester's header
    // already polls the generic notifications collection by userId.
    if (isStaff) {
      await db.collection("notifications").insertOne({
        title: "Support ticket reply",
        message: `${currentUser.name} replied: ${trimmed.slice(0, 80)}`,
        type: "support_ticket",
        priority: "normal",
        read: false,
        deletedBy: [],
        userId: new ObjectId(ticket.requesterId),
        actionUrl: `/${ticket.requesterRole === "doctor" ? "veterinary" : "farmer"}/support?ticketId=${ticketId.toString()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: now,
      }).catch((err) => console.error("Error inserting support ticket notification:", err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error replying to support ticket:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
