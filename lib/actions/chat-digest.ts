"use server"

import clientPromise from "../db"
import { ObjectId } from "mongodb"
import { sendChatDigestEmail } from "../email"

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000

export async function sendMissedMessageDigests() {
  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")

  const unreadChatNotifications = await db.collection("notifications").find({
    type: "chat",
    read: false
  }).toArray()

  if (unreadChatNotifications.length === 0) {
    return { success: true, sent: 0 }
  }

  const byUser = new Map<string, any[]>()
  for (const n of unreadChatNotifications) {
    const key = n.userId.toString()
    if (!byUser.has(key)) byUser.set(key, [])
    byUser.get(key)!.push(n)
  }

  const userIds = Array.from(byUser.keys())

  const [users, presenceDocs] = await Promise.all([
    db.collection("users").find(
      { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1, email: 1 } }
    ).toArray(),
    db.collection("presence").find(
      { _id: { $in: userIds.map((id) => new ObjectId(id)) } }
    ).toArray()
  ])
  const userById = new Map(users.map((u) => [u._id.toString(), u]))
  const presenceById = new Map(presenceDocs.map((p) => [p._id.toString(), p]))

  let sent = 0
  for (const userId of userIds) {
    const presence = presenceById.get(userId)
    const lastActiveAt: Date | null = presence?.lastActiveAt ? new Date(presence.lastActiveAt) : null
    const isCurrentlyOnline = !!lastActiveAt && Date.now() - lastActiveAt.getTime() < OFFLINE_THRESHOLD_MS
    if (isCurrentlyOnline) continue

    const lastDigestSentAt: Date | null = presence?.lastDigestSentAt ? new Date(presence.lastDigestSentAt) : null
    const pendingNotifications = byUser.get(userId)!.filter(
      (n) => !lastDigestSentAt || new Date(n.createdAt) > lastDigestSentAt
    )
    if (pendingNotifications.length === 0) continue

    const user = userById.get(userId)
    if (!user?.email) continue

    const items = pendingNotifications.slice(0, 10).map((n) => ({
      title: n.title,
      message: n.message
    }))

    const result = await sendChatDigestEmail(user.email, user.name, items, pendingNotifications.length)
    if (result.success) {
      sent++
      await db.collection("presence").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { lastDigestSentAt: new Date() } },
        { upsert: true }
      )
    }
  }

  return { success: true, sent }
}
