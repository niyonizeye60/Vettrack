import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

/**
 * Where a seller manages the listing a notification is about. Drugs belong to a
 * pharmacy; every other seller-owned listing is a farmer's animal.
 */
export function sellerListingsPath(category: unknown): string {
  return category === "drugs" ? "/pharmacy-portal/listings" : "/farmer/listings"
}

/**
 * Notify a seller (farmer or pharmacy) about their request. Mirrors the shape used
 * elsewhere in the app.
 */
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

/**
 * A notification for everyone holding a role, e.g. every finance manager. Stored as a
 * broadcast - each person's read and dismissed state is kept separately (see
 * lib/notification-access.ts).
 */
export async function notifyRole(role: string, title: string, message: string, actionUrl: string) {
  try {
    const client = await clientPromise
    await client.db(DB_NAME).collection("notifications").insertOne({
      title,
      message,
      type: "marketplace",
      priority: "normal",
      targetRole: role,
      readBy: [],
      deletedBy: [],
      actionUrl,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  } catch (error) {
    console.error(`Failed to insert ${role} notification:`, error)
  }
}

/** Stock and expiry alerts for Vettrack's own products go to whoever manages listings. */
export async function notifyMarketplaceStaff(title: string, message: string, actionUrl = "/marketplace/listings") {
  await Promise.all([notifySuperadmin(title, message, actionUrl), notifyRole("marketplace_admin", title, message, actionUrl)])
}

/** Refund work goes to finance managers, and to superadmin, who can act on it too. */
export async function notifyFinance(title: string, message: string, actionUrl = "/finance/refunds") {
  await Promise.all([notifySuperadmin(title, message, actionUrl), notifyRole("finance_manager", title, message, actionUrl)])
}
