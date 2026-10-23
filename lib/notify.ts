import { waitUntil } from "@vercel/functions"
import type { Db, Document } from "mongodb"
import { pushNotifications } from "./push"

/**
 * Store in-app notifications and alert the phones of the people they're for.
 *
 * Every notification goes in through here rather than straight into the collection,
 * so none is left out of the alerts. The alerts are sent after the response -
 * waitUntil keeps the function alive for them on Vercel - so they never slow the
 * request, and a failed alert never fails the notification.
 */
export async function insertNotification(db: Db, doc: Document) {
  const result = await db.collection("notifications").insertOne(doc)
  sendInBackground(db, [{ ...doc, _id: result.insertedId }])
  return result
}

export async function insertNotifications(db: Db, docs: Document[]) {
  const result = await db.collection("notifications").insertMany(docs)
  sendInBackground(
    db,
    docs.map((doc, i) => ({ ...doc, _id: result.insertedIds[i] }))
  )
  return result
}

function sendInBackground(db: Db, docs: Document[]) {
  waitUntil(
    pushNotifications(db, docs).catch((error) => console.error("Failed to send push notifications:", error))
  )
}
