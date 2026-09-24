"use server"

import clientPromise from "../db"
import { ObjectId } from "mongodb"
import { sendInseminationReminderEmail } from "../email"

const DB = "ntdm_animal_hospital"

const toDateString = (d: Date) => d.toISOString().split("T")[0]

function reminderTargets() {
  const now = new Date()
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const in14Days = new Date(startOfToday)
  in14Days.setUTCDate(in14Days.getUTCDate() + 14)
  const in7Days = new Date(startOfToday)
  in7Days.setUTCDate(in7Days.getUTCDate() + 7)

  return { target14: toDateString(in14Days), target7: toDateString(in7Days) }
}

function dueReminders(records: any[], target14: string, target7: string) {
  return records
    .map((r) => {
      if (r.expectedBirthDate === target14 && !r.reminder14SentAt) return { record: r, daysLeft: 14 as const }
      if (r.expectedBirthDate === target7 && !r.reminder7SentAt) return { record: r, daysLeft: 7 as const }
      return null
    })
    .filter((x): x is { record: any; daysLeft: 7 | 14 } => x !== null)
}

/** Send one reminder, mark the record so it can't fire twice, and drop an in-app notification. */
async function sendReminder(db: any, record: any, daysLeft: 7 | 14, farmer: { name: string; email: string }) {
  const result = await sendInseminationReminderEmail(farmer.email, farmer.name, record.animalName, record.expectedBirthDate, daysLeft)
  if (!result.success) return false

  const sentField = daysLeft === 14 ? "reminder14SentAt" : "reminder7SentAt"
  await db.collection("insemination_records").updateOne({ _id: record._id }, { $set: { [sentField]: new Date() } })

  await db.collection("notifications").insertOne({
    title: "Upcoming calving",
    message: `${record.animalName || "Your cow"} is expected to calve in about ${daysLeft === 14 ? "2 weeks" : "1 week"}.`,
    type: "insemination",
    priority: "normal",
    read: false,
    deletedBy: [],
    userId: new ObjectId(record.farmerId),
    actionUrl: "/farmer/insemination",
    expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  }).catch((err: unknown) => console.error("Error inserting insemination reminder notification:", err))

  return true
}

/**
 * Cron sweep (app/api/cron/insemination-reminders/route.ts) - depends on
 * CRON_SECRET being set in Vercel's Production environment and the cron actually
 * firing. Kept as a catch-all; checkInseminationRemindersForFarmer below is the
 * primary path and doesn't depend on either - see its comment.
 */
export async function sendInseminationReminders() {
  const client = await clientPromise
  const db = client.db(DB)
  const { target14, target7 } = reminderTargets()

  const records = await db.collection("insemination_records").find({
    expectedBirthDate: { $in: [target14, target7] },
    pregnancyFailed: { $ne: true },
    deliveredBabies: null,
  }).toArray()

  if (records.length === 0) {
    return { success: true, sent: 0 }
  }

  const due = dueReminders(records, target14, target7)
  if (due.length === 0) {
    return { success: true, sent: 0 }
  }

  const farmerIds = Array.from(new Set(due.map((d) => d.record.farmerId).filter(Boolean)))
  const farmers = await db.collection("users").find(
    { _id: { $in: farmerIds.map((id) => new ObjectId(id)) } },
    { projection: { name: 1, email: 1 } }
  ).toArray()
  const farmerById = new Map(farmers.map((f) => [f._id.toString(), f]))

  let sent = 0
  for (const { record, daysLeft } of due) {
    const farmer = farmerById.get(record.farmerId)
    if (!farmer?.email) continue
    if (await sendReminder(db, record, daysLeft, { name: farmer.name, email: farmer.email })) sent++
  }

  return { success: true, sent }
}

/**
 * Session-triggered counterpart, called from useInseminationReminders on every
 * farmer page load - mirrors the ThingSpeak temperature alert
 * (app/api/thingspeak/route.ts) and the daily-summary digest
 * (sendDailyActivitySummaryForFarmer in lib/actions/daily-summary.ts): a normal
 * authenticated request checks the condition and sends if due, instead of relying
 * on Vercel Cron to fire at all. No time-of-day gate is needed here, unlike the
 * daily digest - this is driven by expectedBirthDate being 7/14 days out, not by
 * "today" still being in progress - and it's already idempotent per record via
 * reminder14SentAt/reminder7SentAt, the same flags the cron sweep checks, so
 * neither path can double-send.
 */
export async function checkInseminationRemindersForFarmer(farmerId: string) {
  const client = await clientPromise
  const db = client.db(DB)
  const { target14, target7 } = reminderTargets()

  const records = await db.collection("insemination_records").find({
    farmerId,
    expectedBirthDate: { $in: [target14, target7] },
    pregnancyFailed: { $ne: true },
    deliveredBabies: null,
  }).toArray()

  if (records.length === 0) {
    return { success: true, sent: 0 }
  }

  const due = dueReminders(records, target14, target7)
  if (due.length === 0) {
    return { success: true, sent: 0 }
  }

  const farmer = await db.collection("users").findOne(
    { _id: new ObjectId(farmerId) },
    { projection: { name: 1, email: 1 } }
  )
  if (!farmer?.email) {
    return { success: true, sent: 0 }
  }

  let sent = 0
  for (const { record, daysLeft } of due) {
    if (await sendReminder(db, record, daysLeft, { name: farmer.name, email: farmer.email })) sent++
  }

  return { success: true, sent }
}
