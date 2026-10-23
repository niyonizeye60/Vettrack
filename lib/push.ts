import webpush from "web-push"
import { ObjectId, type Collection, type Db, type Document } from "mongodb"
import clientPromise from "./db"
import { isPresenceOnline } from "./presence"
import { localizeNotification } from "./notification-messages"

/**
 * Alerts on people's phones and computers ("web push") for in-app notifications.
 *
 * A device is subscribed by whoever is signed in on it (/api/push/subscription), and
 * the subscription remembers the login session it was made under. Alerts only go to
 * subscriptions whose session is still live, so logging out - or an account being
 * suspended, which ends its sessions - stops a shared phone getting that person's
 * alerts without the phone having to do anything.
 *
 * Does nothing until NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set
 * (generate a pair with `npx web-push generate-vapid-keys`).
 */

const DB_NAME = "ntdm_animal_hospital"
const COLLECTION = "push_subscriptions"

// An alert the phone couldn't receive within this long is stale; the notification is
// still waiting in the app.
const MAX_TTL_SECONDS = 3 * 24 * 60 * 60
// Push services are separate HTTPS calls; don't open hundreds at once for a bulk send.
const SEND_CONCURRENCY = 20

export type PushLanguage = "en" | "rw"

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface StoredSubscription extends PushSubscriptionInput {
  _id: ObjectId
  userId: ObjectId
  sessionId: string
  language: PushLanguage
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}

let vapidReady: boolean | undefined
function vapidConfigured(): boolean {
  if (vapidReady === undefined) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    try {
      if (publicKey && privateKey) {
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@vettrack.rw", publicKey, privateKey)
        vapidReady = true
      } else {
        vapidReady = false
      }
    } catch (error) {
      console.error("Invalid VAPID keys - push notifications are off:", error)
      vapidReady = false
    }
  }
  return vapidReady
}

/** Ensured once per warm process - createIndex is a no-op after the first call. */
let indexesEnsured = false
async function subscriptions() {
  const client = await clientPromise
  const collection = client.db(DB_NAME).collection<StoredSubscription>(COLLECTION)
  if (!indexesEnsured) {
    try {
      await collection.createIndex({ endpoint: 1 }, { unique: true })
      await collection.createIndex({ userId: 1 })
      indexesEnsured = true
    } catch (error) {
      console.error("Failed to ensure push subscription indexes:", error)
    }
  }
  return collection
}

/** The subscription a browser sent, or null if it isn't one. */
export function parsePushSubscription(value: unknown): PushSubscriptionInput | null {
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  if (typeof endpoint !== "string" || endpoint.length > 1024 || !endpoint.startsWith("https://")) return null
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 256 || auth.length > 256) return null
  return { endpoint, keys: { p256dh, auth } }
}

/**
 * Link a device to the signed-in user and their current session.
 *
 * `claim` is true when the user has just turned alerts on themselves. Without it this
 * only refreshes a device that is already theirs - each page load does that, to pick
 * up a new session or language - so someone signing in on a phone another person
 * turned alerts on for doesn't start getting alerts they never asked for.
 *
 * Returns whether the device is now linked to this user.
 */
export async function savePushSubscription(input: {
  subscription: PushSubscriptionInput
  userId: string
  sessionId: string
  language: PushLanguage
  userAgent?: string
  claim: boolean
}): Promise<boolean> {
  const collection = await subscriptions()
  const now = new Date()
  const set = {
    keys: input.subscription.keys,
    userId: new ObjectId(input.userId),
    sessionId: input.sessionId,
    language: input.language,
    userAgent: input.userAgent?.slice(0, 300),
    updatedAt: now,
  }
  if (input.claim) {
    await collection.updateOne(
      { endpoint: input.subscription.endpoint },
      { $set: set, $setOnInsert: { createdAt: now } },
      { upsert: true }
    )
    return true
  }
  const result = await collection.updateOne(
    { endpoint: input.subscription.endpoint, userId: set.userId },
    { $set: set }
  )
  return result.matchedCount > 0
}

/** Stop alerts to one of the user's devices. */
export async function removePushSubscription(endpoint: string, userId: string): Promise<void> {
  const collection = await subscriptions()
  await collection.deleteOne({ endpoint, userId: new ObjectId(userId) })
}

/**
 * Who a stored notification is for: user ids, or "all". Mirrors the feed rules in
 * lib/notification-access.ts - personal (userId), broadcast (targetRole), and superadmin
 * alerts (role "superadmin" with neither).
 */
function audienceRole(doc: Document): string | null {
  if (doc.userId) return null
  if (typeof doc.targetRole === "string") return doc.targetRole
  return doc.role === "superadmin" ? "superadmin" : null
}

/** Send the alerts for notifications that were just stored. Never throws for one bad device. */
export async function pushNotifications(db: Db, docs: Document[]): Promise<void> {
  if (docs.length === 0 || !vapidConfigured()) return

  const roles = new Set(docs.map(audienceRole).filter((role): role is string => role !== null && role !== "all"))
  const idsByRole = new Map<string, string[]>()
  if (roles.size > 0) {
    const users = await db
      .collection("users")
      .find({ role: { $in: Array.from(roles) } }, { projection: { role: 1 } })
      .toArray()
    for (const user of users) {
      idsByRole.set(user.role, [...(idsByRole.get(user.role) ?? []), user._id.toString()])
    }
  }

  const audiences: ("all" | Set<string>)[] = docs.map((doc) => {
    if (doc.userId) return new Set([String(doc.userId)])
    const role = audienceRole(doc)
    if (role === "all") return "all"
    return new Set(role ? idsByRole.get(role) ?? [] : [])
  })
  const everyone = audiences.includes("all")
  const userIds = Array.from(
    new Set(audiences.flatMap((audience) => (audience === "all" ? [] : Array.from(audience))))
  ).filter((id) => ObjectId.isValid(id))
  if (!everyone && userIds.length === 0) return

  const collection = db.collection<StoredSubscription>(COLLECTION)
  const subs = await collection
    .find(everyone ? {} : { userId: { $in: userIds.map((id) => new ObjectId(id)) } })
    .toArray()
  if (subs.length === 0) return

  // Only devices whose login is still live - see the comment at the top.
  const sessions = await db
    .collection("sessions")
    .find(
      { sessionId: { $in: subs.map((sub) => sub.sessionId) }, expiresAt: { $gt: new Date() } },
      { projection: { sessionId: 1, userId: 1 } }
    )
    .toArray()
  const liveSessions = new Set(sessions.map((session) => `${session.sessionId}:${String(session.userId)}`))
  const liveSubs = subs.filter((sub) => liveSessions.has(`${sub.sessionId}:${sub.userId.toString()}`))
  if (liveSubs.length === 0) return

  // Like the chat email: someone using Vettrack right now already sees the message live.
  const online = new Set<string>()
  if (docs.some((doc) => doc.type === "chat")) {
    const presence = await db
      .collection("presence")
      .find({ _id: { $in: liveSubs.map((sub) => sub.userId) } } as Document)
      .toArray()
    for (const p of presence) if (isPresenceOnline(p as never)) online.add(String(p._id))
  }

  const tasks: (() => Promise<void>)[] = []
  docs.forEach((doc, i) => {
    const audience = audiences[i]
    for (const sub of liveSubs) {
      const userId = sub.userId.toString()
      if (audience !== "all" && !audience.has(userId)) continue
      if (doc.type === "chat" && online.has(userId)) continue
      tasks.push(() => sendOne(collection, sub, doc))
    }
  })
  for (let i = 0; i < tasks.length; i += SEND_CONCURRENCY) {
    await Promise.all(tasks.slice(i, i + SEND_CONCURRENCY).map((task) => task()))
  }
}

function plainText(value: unknown, max: number): string {
  const text = String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function ttlSeconds(expiresAt: unknown): number {
  const ms = expiresAt instanceof Date ? expiresAt.getTime() - Date.now() : NaN
  return Number.isFinite(ms) ? Math.max(60, Math.min(MAX_TTL_SECONDS, Math.round(ms / 1000))) : MAX_TTL_SECONDS
}

async function sendOne(
  collection: Collection<StoredSubscription>,
  sub: StoredSubscription,
  doc: Document
): Promise<void> {
  // Stored in English with a template id; show it in the language the device uses.
  // Param labels stay in English here - the server has no UI translations.
  const { title, message } = localizeNotification(
    { title: String(doc.title ?? ""), message: String(doc.message ?? ""), i18n: doc.i18n },
    sub.language,
    (key) => key
  )
  const id = doc._id ? String(doc._id) : undefined
  const url = typeof doc.actionUrl === "string" && /^\/(?!\/)/.test(doc.actionUrl) ? doc.actionUrl : undefined
  // One alert per chat conversation, replaced by each new message, rather than a pile.
  const tag = doc.type === "chat" && url ? url : id

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify({
        id,
        title: plainText(title, 100) || "VetTrack",
        body: plainText(message, 240),
        url,
        tag,
        renotify: doc.type === "chat",
      }),
      {
        TTL: ttlSeconds(doc.expiresAt),
        urgency: doc.priority === "high" || doc.priority === "critical" ? "high" : "normal",
        timeout: 10_000,
      }
    )
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) {
      // The browser dropped this subscription (alerts turned off, app removed...).
      await collection.deleteOne({ _id: sub._id }).catch(() => {})
      return
    }
    console.error("Failed to send push notification:", error)
  }
}
