import { ObjectId, type Db } from "mongodb"
import type { NotificationText } from "./notification-messages"
import { insertNotification } from "./notify"

/**
 * Alerts for the admin portal.
 *
 * They are stored in the shared notifications collection through lib/notify.ts like every
 * other notification, so admins get the same bell, per-person read state, links and phone
 * alerts as the other portals. Each is created when the thing happens (an account
 * registers, a ticket gets a reply...) or by the timed checks in lib/admin-alerts.ts.
 *
 * Never throws: an alert that fails to send must not fail the action it accompanies.
 */

export type AdminAlertType = "account" | "epidemic" | "support_ticket" | "consultation"

export interface AdminAlert {
  text: NotificationText
  type: AdminAlertType
  /** The admin-portal page where the admin acts on it. */
  actionUrl: string
  /** "high" marks it urgent in the feed and on the phone. */
  priority?: "normal" | "high"
  expiresInDays?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function alertFields(alert: AdminAlert) {
  return {
    ...alert.text,
    type: alert.type,
    priority: alert.priority ?? "normal",
    deletedBy: [],
    actionUrl: alert.actionUrl,
    expiresAt: new Date(Date.now() + (alert.expiresInDays ?? 14) * DAY_MS),
    createdAt: new Date(),
  }
}

/**
 * Every admin. Stored as one broadcast whose read state is kept per admin - see
 * lib/notification-access.ts. `alreadyRead` names admins who already know, such as the
 * one who did the thing, so it doesn't show as new to them or buzz their phone.
 */
export async function notifyAdmins(db: Db, alert: AdminAlert & { alreadyRead?: string[] }) {
  try {
    await insertNotification(db, { ...alertFields(alert), targetRole: "admin", readBy: alert.alreadyRead ?? [] })
  } catch (error) {
    console.error(`Failed to insert admin ${alert.type} alert:`, error)
  }
}

/** One admin, e.g. whoever a support ticket is assigned to. */
export async function notifyAdmin(db: Db, adminId: string, alert: AdminAlert) {
  if (!ObjectId.isValid(adminId)) return
  try {
    await insertNotification(db, { ...alertFields(alert), userId: new ObjectId(adminId), read: false })
  } catch (error) {
    console.error(`Failed to insert admin ${alert.type} alert:`, error)
  }
}

/**
 * Of the given user ids (support tickets' assignees), the ones that belong to admins.
 * A ticket held by a superadmin, or by an account that no longer exists, has no admin.
 */
export async function adminIdsAmong(db: Db, ids: unknown[]): Promise<Set<string>> {
  const valid = Array.from(new Set(ids.map((id) => (id == null ? "" : String(id))))).filter((id) => ObjectId.isValid(id))
  if (valid.length === 0) return new Set()
  const admins = await db
    .collection("users")
    .find({ _id: { $in: valid.map((id) => new ObjectId(id)) }, role: "admin" }, { projection: { _id: 1 } })
    .toArray()
  return new Set(admins.map((admin) => admin._id.toString()))
}

/**
 * Alert the admin a support ticket is assigned to, or every admin if nobody (or no admin)
 * holds it - an unowned ticket is the whole team's to pick up.
 */
export async function notifyTicketOwner(db: Db, assignedTo: unknown, alert: AdminAlert) {
  try {
    const owner = assignedTo == null ? null : String(assignedTo)
    if (owner && (await adminIdsAmong(db, [owner])).has(owner)) {
      await notifyAdmin(db, owner, alert)
    } else {
      await notifyAdmins(db, alert)
    }
  } catch (error) {
    console.error("Failed to alert the admin for a support ticket:", error)
  }
}
