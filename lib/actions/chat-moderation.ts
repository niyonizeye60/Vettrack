"use server"

import clientPromise from "../db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "./auth"
import { updateUserStatus } from "./superadmin"
import { logUserActivity } from "./superadmin"
import { decryptText } from "../crypto"
import { revalidatePath } from "next/cache"

async function requireSuperAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "superadmin") {
    throw new Error("Unauthorized")
  }
  return user
}

export async function getChatReports() {
  await requireSuperAdmin()
  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")

  const reports = await db.collection("chat_reports").find({}).sort({ createdAt: -1 }).toArray()
  if (reports.length === 0) return []

  const userIds = new Set<string>()
  reports.forEach((r) => {
    userIds.add(r.reporterId.toString())
    userIds.add(r.reportedUserId.toString())
    if (r.resolvedBy) userIds.add(r.resolvedBy.toString())
  })

  const users = await db.collection("users").find(
    { _id: { $in: Array.from(userIds).map((id) => new ObjectId(id)) } },
    { projection: { name: 1, email: 1, role: 1, status: 1 } }
  ).toArray()
  const userById = new Map(users.map((u) => [u._id.toString(), u]))

  return reports.map((r) => {
    const reporter = userById.get(r.reporterId.toString())
    const reportedUser = userById.get(r.reportedUserId.toString())
    const resolver = r.resolvedBy ? userById.get(r.resolvedBy.toString()) : null
    return {
      id: r._id.toString(),
      conversationId: r.conversationId.toString(),
      messageId: r.messageId ? r.messageId.toString() : null,
      reason: r.reason,
      status: r.status as "open" | "resolved" | "dismissed",
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt || null,
      resolutionNote: r.resolutionNote || null,
      resolvedByName: resolver?.name || null,
      reporter: reporter
        ? { id: reporter._id.toString(), name: reporter.name, email: reporter.email }
        : null,
      reportedUser: reportedUser
        ? {
            id: reportedUser._id.toString(),
            name: reportedUser.name,
            email: reportedUser.email,
            status: reportedUser.status || "active",
          }
        : null,
    }
  })
}

export async function getAllConversationsForModeration() {
  await requireSuperAdmin()
  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")

  const conversations = await db.collection("conversations").find({}).sort({ lastMessageAt: -1 }).limit(200).toArray()
  if (conversations.length === 0) return []

  const userIds = new Set<string>()
  conversations.forEach((c) => (c.participants || []).forEach((id: ObjectId) => userIds.add(id.toString())))

  const users = await db.collection("users").find(
    { _id: { $in: Array.from(userIds).map((id) => new ObjectId(id)) } },
    { projection: { name: 1, role: 1 } }
  ).toArray()
  const userById = new Map(users.map((u) => [u._id.toString(), u]))

  const lastMessages = await db.collection("messages")
    .find({ conversationId: { $in: conversations.map((c) => c._id) } })
    .sort({ createdAt: -1 })
    .toArray()
  const lastMessageByConversation = new Map<string, any>()
  for (const m of lastMessages) {
    const key = m.conversationId.toString()
    if (!lastMessageByConversation.has(key)) lastMessageByConversation.set(key, m)
  }

  return conversations.map((c) => {
    const participants = (c.participants || []).map((id: ObjectId) => {
      const u = userById.get(id.toString())
      return u ? { id: id.toString(), name: u.name, role: u.role } : { id: id.toString(), name: "Unknown", role: "" }
    })
    const lastMessage = lastMessageByConversation.get(c._id.toString())
    return {
      id: c._id.toString(),
      participants,
      lastMessage: lastMessage
        ? { content: decryptText(lastMessage.content), createdAt: lastMessage.createdAt }
        : null,
      isBlocked: (c.blockedBy || []).length > 0,
      createdAt: c.createdAt,
    }
  })
}

export async function getConversationMessagesForModeration(conversationId: string) {
  await requireSuperAdmin()
  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")

  const messages = await db.collection("messages")
    .find({ conversationId: new ObjectId(conversationId) })
    .sort({ createdAt: 1 })
    .toArray()

  const senderIds = Array.from(new Set(messages.map((m) => m.senderId.toString())))
  const users = await db.collection("users").find(
    { _id: { $in: senderIds.map((id) => new ObjectId(id)) } },
    { projection: { name: 1 } }
  ).toArray()
  const nameById = new Map(users.map((u) => [u._id.toString(), u.name as string]))

  return messages.map((m) => ({
    id: m._id.toString(),
    senderId: m.senderId.toString(),
    senderName: nameById.get(m.senderId.toString()) || "Unknown",
    content: decryptText(m.content),
    createdAt: m.createdAt,
    editedAt: m.editedAt || null,
    deletedFor: (m.deletedFor || []) as string[],
  }))
}

export async function resolveChatReport(reportId: string, resolutionNote: string) {
  const currentUser = await requireSuperAdmin()
  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")

  await db.collection("chat_reports").updateOne(
    { _id: new ObjectId(reportId) },
    {
      $set: {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: currentUser._id,
        resolutionNote: resolutionNote?.trim() || "",
      },
    }
  )

  await logUserActivity({
    userId: currentUser._id.toString(),
    action: "chat.report.resolved",
    details: reportId,
  })

  revalidatePath("/superadmin/moderation")
  return { success: true }
}

export async function dismissChatReport(reportId: string) {
  const currentUser = await requireSuperAdmin()
  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")

  await db.collection("chat_reports").updateOne(
    { _id: new ObjectId(reportId) },
    { $set: { status: "dismissed", resolvedAt: new Date(), resolvedBy: currentUser._id } }
  )

  await logUserActivity({
    userId: currentUser._id.toString(),
    action: "chat.report.dismissed",
    details: reportId,
  })

  revalidatePath("/superadmin/moderation")
  return { success: true }
}

export async function suspendReportedUser(userId: string) {
  const currentUser = await requireSuperAdmin()
  const result = await updateUserStatus(userId, "suspended")

  await logUserActivity({
    userId: currentUser._id.toString(),
    action: "chat.user.suspended",
    details: userId,
  })

  revalidatePath("/superadmin/moderation")
  return result
}
