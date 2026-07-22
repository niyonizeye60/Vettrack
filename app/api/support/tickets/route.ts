export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { encryptText } from "@/lib/crypto"
import { ObjectId } from "mongodb"

const DB = "ntdm_animal_hospital"
const REQUESTER_ROLES = ["farmer", "doctor"]
const STAFF_ROLES = ["admin", "superadmin"]

// GET: list tickets.
// - farmer/doctor: only their own tickets.
// - admin/superadmin: the shared queue, optionally filtered by ?scope=unassigned|mine&status=open
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DB)
    const { searchParams } = new URL(request.url)

    let query: any = {}

    if (REQUESTER_ROLES.includes(currentUser.role)) {
      query.requesterId = currentUser._id
    } else if (STAFF_ROLES.includes(currentUser.role)) {
      const scope = searchParams.get("scope")
      const status = searchParams.get("status")
      if (scope === "unassigned") query.assignedTo = null
      if (scope === "mine") query.assignedTo = currentUser._id
      if (status) query.status = status
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tickets = await db.collection("supportTickets")
      .find(query)
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .toArray()

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t._id.toString(),
        subject: t.subject,
        status: t.status,
        requesterId: t.requesterId,
        requesterRole: t.requesterRole,
        requesterName: t.requesterName,
        requesterPhone: t.requesterPhone || null,
        assignedTo: t.assignedTo || null,
        assignedToName: t.assignedToName || null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastMessageAt: t.lastMessageAt,
        unreadByAdmin: !!t.unreadByAdmin,
        unreadByRequester: !!t.unreadByRequester,
      })),
    })
  } catch (error) {
    console.error("Error listing support tickets:", error)
    return NextResponse.json({ error: "Failed to list tickets" }, { status: 500 })
  }
}

// POST: farmer/doctor opens a new ticket with an initial message.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !REQUESTER_ROLES.includes(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subject, message } = await request.json()
    const trimmedSubject = (subject || "").toString().trim()
    const trimmedMessage = (message || "").toString().trim()

    if (!trimmedSubject || !trimmedMessage) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB)
    const now = new Date()

    const ticket = {
      subject: trimmedSubject.slice(0, 200),
      status: "open",
      requesterId: currentUser._id,
      requesterRole: currentUser.role,
      requesterName: currentUser.name,
      requesterPhone: currentUser.phone || null,
      requesterEmail: currentUser.email || null,
      assignedTo: null,
      assignedToName: null,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      unreadByAdmin: true,
      unreadByRequester: false,
    }

    const result = await db.collection("supportTickets").insertOne(ticket)

    await db.collection("supportMessages").insertOne({
      ticketId: result.insertedId,
      senderId: currentUser._id,
      senderRole: currentUser.role,
      senderName: currentUser.name,
      content: encryptText(trimmedMessage),
      createdAt: now,
    })

    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (error) {
    console.error("Error creating support ticket:", error)
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
  }
}
