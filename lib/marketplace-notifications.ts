import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

/** Notify a farmer about their request. Mirrors the shape used elsewhere in the app. */
export async function notifyFarmer(
  farmerId: string,
  title: string,
  message: string,
  actionUrl: string
) {
  try {
    const client = await clientPromise
    await client.db(DB_NAME).collection("notifications").insertOne({
      title,
      message,
      type: "marketplace",
      priority: "normal",
      read: false,
      deletedBy: [],
      userId: new ObjectId(farmerId),
      actionUrl,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  } catch (error) {
    // A missing notification must never fail the decision it accompanies.
    console.error("Failed to insert marketplace notification:", error)
  }
}

/** Tell superadmin a new request needs review - the queue otherwise has no push signal. */
export async function notifySuperadmin(title: string, message: string, actionUrl: string) {
  try {
    const client = await clientPromise
    await client.db(DB_NAME).collection("notifications").insertOne({
      title,
      message,
      type: "marketplace",
      priority: "normal",
      role: "superadmin",
      read: false,
      deletedBy: [],
      actionUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Failed to insert superadmin marketplace notification:", error)
  }
}
