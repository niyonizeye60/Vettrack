import { ObjectId } from "mongodb"

/**
 * Who a notification document is for, and whether a given user has read it.
 *
 * Two shapes reach a user's feed:
 * - personal: `userId` is set. Its own `read` flag is that user's read state.
 * - broadcast: `targetRole` is a role or "all". Nothing creates these today, but older
 *   documents do; one `read` flag can't hold many users' state, so readers are kept in
 *   `readBy` instead.
 *
 * Superadmin alerts (`role: "superadmin"`, no userId/targetRole) match neither, so they
 * never appear in - and can never be changed from - another user's feed.
 */

interface Viewer {
  _id: string
  role: string
}

/** Mongo filter for the notifications `viewer` may see and act on. */
export function audienceFilter(viewer: Viewer) {
  const or: Record<string, unknown>[] = [{ targetRole: viewer.role }, { targetRole: "all" }]
  if (ObjectId.isValid(viewer._id)) or.push({ userId: new ObjectId(viewer._id) })
  return { $or: or }
}

/** A stored notification document - fields read here are all optional on it. */
type NotificationDoc = Record<string, any>

export function isPersonal(doc: NotificationDoc): boolean {
  return doc.userId != null
}

export function isReadBy(doc: NotificationDoc, viewerId: string): boolean {
  if (isPersonal(doc)) return doc.read === true
  return Array.isArray(doc.readBy) && doc.readBy.includes(viewerId)
}
