import clientPromise from "./db"
import { ObjectId } from "mongodb"

// Test accounts are flagged via users.isTestAccount (toggled from the superadmin Edit
// User dialog) so QA/dev logins don't pollute production activity logs and error rates.
async function isTestAccount(userId: string | ObjectId): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    const id = typeof userId === "string" ? new ObjectId(userId) : userId
    const user = await db.collection("users").findOne({ _id: id }, { projection: { isTestAccount: 1 } })
    return !!user?.isTestAccount
  } catch {
    return false
  }
}

// Shared by lib/actions/auth.ts, lib/actions.ts, and lib/actions/superadmin.ts (via
// logUserActivity) - kept dependency-free so auth.ts (which superadmin.ts imports from)
// can log without creating a circular import.
export async function logActivity(userId: string | ObjectId, action: string, details?: string) {
  try {
    if (await isTestAccount(userId)) return
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    await db.collection("user_activity_logs").insertOne({
      userId: typeof userId === "string" ? new ObjectId(userId) : userId,
      action,
      details: details || "",
      ipAddress: "",
      userAgent: "",
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Error logging user activity:", error)
  }
}

// Same dependency-free reasoning as logActivity above - lets auth.ts and the payment
// routes record a critical failure without pulling in all of superadmin.ts.
export async function logSystemError(error: {
  message: string
  stack?: string
  userId?: string
  action?: string
}) {
  try {
    if (error.userId && (await isTestAccount(error.userId))) return
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    await db.collection("error_logs").insertOne({
      ...error,
      createdAt: new Date(),
      resolved: false,
    })
  } catch (err) {
    console.error("Failed to log system error:", err)
  }
}
