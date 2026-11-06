import clientPromise from "./db"
import { notificationText } from "./notification-messages"
import { insertNotification } from "./notify"

/**
 * Tells superadmins a scheduled job failed. Only the cron routes call this, after checking
 * CRON_SECRET, so it lives outside the server-action files where anyone could call it.
 */
export async function notifyCronFailure(jobName: string, error: unknown) {
  try {
    const client = await clientPromise
    const db = client.db("ntdm_animal_hospital")
    await insertNotification(db, {
      ...notificationText("cronFailed", { job: jobName, error: error instanceof Error ? error.message : String(error) }),
      type: "system",
      priority: "high",
      role: "superadmin",
      read: false,
      deletedBy: [],
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  } catch (notifyError) {
    console.error("Failed to insert cron-failure notification:", notifyError)
  }
}
