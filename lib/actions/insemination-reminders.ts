"use server"

import clientPromise from "../db"
import { ObjectId } from "mongodb"
import { sendInseminationReminderEmail } from "../email"

const DB = "ntdm_animal_hospital"

const toDateString = (d: Date) => d.toISOString().split("T")[0]

export async function sendInseminationReminders() {
  const client = await clientPromise
  const db = client.db(DB)

  const now = new Date()
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const in14Days = new Date(startOfToday)
  in14Days.setUTCDate(in14Days.getUTCDate() + 14)
  const in7Days = new Date(startOfToday)
  in7Days.setUTCDate(in7Days.getUTCDate() + 7)

  const target14 = toDateString(in14Days)
  const target7 = toDateString(in7Days)

  const records = await db.collection("insemination_records").find({
    expectedBirthDate: { $in: [target14, target7] },
    pregnancyFailed: { $ne: true },
    deliveredBabies: null,
  }).toArray()

  if (records.length === 0) {
    return { success: true, sent: 0 }
  }

  const due = records
    .map((r) => {
      if (r.expectedBirthDate === target14 && !r.reminder14SentAt) return { record: r, daysLeft: 14 }
      if (r.expectedBirthDate === target7 && !r.reminder7SentAt) return { record: r, daysLeft: 7 }
      return null
    })
    .filter((x): x is { record: (typeof records)[number]; daysLeft: number } => x !== null)

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

    const result = await sendInseminationReminderEmail(
      farmer.email,
      farmer.name,
      record.animalName,
      record.expectedBirthDate,
      daysLeft
    )
    if (!result.success) continue

    sent++
    const sentField = daysLeft === 14 ? "reminder14SentAt" : "reminder7SentAt"
    await db.collection("insemination_records").updateOne(
      { _id: record._id },
      { $set: { [sentField]: new Date() } }
    )

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
    }).catch((err) => console.error("Error inserting insemination reminder notification:", err))
  }

  return { success: true, sent }
}
