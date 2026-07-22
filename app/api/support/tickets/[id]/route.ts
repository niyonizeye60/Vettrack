export const dynamicParams = true;
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { decryptText } from "@/lib/crypto"
import { ObjectId } from "mongodb"

const DB = "ntdm_animal_hospital"
const STAFF_ROLES = ["admin", "superadmin"]

function canAccess(currentUser: any, ticket: any) {
  if (STAFF_ROLES.includes(currentUser.role)) return true
  return ticket.requesterId === currentUser._id
}

// GET: ticket detail with its full message thread.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DB)
    const ticketId = new ObjectId(params.id)

    const ticket = await db.collection("supportTickets").findOne({ _id: ticketId })
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }
    if (!canAccess(currentUser, ticket)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Opening the ticket clears this viewer's unread flag.
    if (STAFF_ROLES.includes(currentUser.role) && ticket.unreadByAdmin) {
      await db.collection("supportTickets").updateOne({ _id: ticketId }, { $set: { unreadByAdmin: false } })
    } else if (ticket.requesterId === currentUser._id && ticket.unreadByRequester) {
      await db.collection("supportTickets").updateOne({ _id: ticketId }, { $set: { unreadByRequester: false } })
    }

    const messages = await db.collection("supportMessages")
      .find({ ticketId })
      .sort({ createdAt: 1 })
      .toArray()

    return NextResponse.json({
      ticket: {
        id: ticket._id.toString(),
        subject: ticket.subject,
        status: ticket.status,
        requesterId: ticket.requesterId,
        requesterRole: ticket.requesterRole,
        requesterName: ticket.requesterName,
        requesterPhone: ticket.requesterPhone || null,
        requesterEmail: ticket.requesterEmail || null,
        assignedTo: ticket.assignedTo || null,
        assignedToName: ticket.assignedToName || null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m._id.toString(),
        senderId: m.senderId,
        senderRole: m.senderRole,
        senderName: m.senderName,
        content: decryptText(m.content),
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching support ticket:", error)
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 })
  }
}

// PATCH: staff-only ticket management (admin/superadmin) - claim, resolve, or reopen.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !STAFF_ROLES.includes(currentUser.role) || !ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()
    if (!["claim", "resolve", "reopen"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB)
    const ticketId = new ObjectId(params.id)

    const ticket = await db.collection("supportTickets").findOne({ _id: ticketId })
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    const update: Record<string, any> = { updatedAt: new Date() }
    if (action === "claim") {
      update.assignedTo = currentUser._id
      update.assignedToName = currentUser.name
      update.status = "in_progress"
    } else if (action === "resolve") {
      update.status = "resolved"
    } else if (action === "reopen") {
      update.status = "open"
    }

    // Any admin action attributes ownership if the ticket has no owner yet -
    // otherwise a resolved/reopened ticket could still show as unclaimed.
    if (action !== "claim" && !ticket.assignedTo) {
      update.assignedTo = currentUser._id
      update.assignedToName = currentUser.name
    }

    await db.collection("supportTickets").updateOne(
      { _id: ticketId },
      { $set: update }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating support ticket:", error)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}
