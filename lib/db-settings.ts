import clientPromise from "@/lib/db"
import { COMMISSION_PERCENTAGE } from "@/lib/constants"

const DB_NAME = "ntdm_animal_hospital"

interface SettingDoc {
  key: string
  value: number | string
  updatedAt: Date
}

/**
 * Get the global commission percentage from DB settings.
 * Falls back to the hardcoded COMMISSION_PERCENTAGE constant if not set.
 */
export async function getCommissionPercentage(): Promise<number> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const setting = await db.collection<SettingDoc>("settings").findOne({ key: "commission_percentage" })
    if (setting && typeof setting.value === "number") {
      return setting.value
    }
  } catch (error) {
    console.error("Failed to fetch commission percentage from DB:", error)
  }
  return COMMISSION_PERCENTAGE
}

/**
 * Set the global commission percentage in DB settings.
 */
export async function setCommissionPercentage(value: number): Promise<void> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  await db.collection<SettingDoc>("settings").updateOne(
    { key: "commission_percentage" },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true }
  )
}

/**
 * Get all settings as a flat key-value map.
 */
export async function getAllSettings(): Promise<Record<string, number | string>> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const docs = await db.collection<SettingDoc>("settings").find({}).toArray()
    const map: Record<string, number | string> = {}
    for (const doc of docs) {
      map[doc.key] = doc.value
    }
    return map
  } catch (error) {
    console.error("Failed to fetch settings:", error)
    return {}
  }
}
