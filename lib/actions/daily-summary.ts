"use server"

import clientPromise from "../db"
import { ObjectId } from "mongodb"
import { sendDailyActivitySummaryEmail } from "../email"
import { todayRwandaRange, todayRwandaDateString, buildActivitySummaryGroups } from "../activity-summary"

const DB = "ntdm_animal_hospital"

export async function sendDailyActivitySummaries() {
  const client = await clientPromise
  const db = client.db(DB)

  const { start, end } = todayRwandaRange()

  const logs = await db.collection("user_activity_logs")
    .find({ createdAt: { $gte: start, $lte: end } })
    .toArray()

  if (logs.length === 0) {
    return { success: true, sent: 0 }
  }

  const logsByFarmer = new Map<string, typeof logs>()
  for (const log of logs) {
    const key = log.userId.toString()
    if (!logsByFarmer.has(key)) logsByFarmer.set(key, [])
    logsByFarmer.get(key)!.push(log)
  }

  const farmerIds = Array.from(logsByFarmer.keys())
  const farmers = await db.collection("users").find(
    { _id: { $in: farmerIds.map((id) => new ObjectId(id)) }, role: "farmer" },
    { projection: { name: 1, email: 1 } }
  ).toArray()

  const dateLabel = new Date(`${todayRwandaDateString()}T00:00:00.000+02:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  let sent = 0
  for (const farmer of farmers) {
    const farmerLogs = logsByFarmer.get(farmer._id.toString())
    if (!farmerLogs || farmerLogs.length === 0 || !farmer.email) continue

    const groups = buildActivitySummaryGroups(farmerLogs as any)
    if (groups.length === 0) continue // only session/account events today - nothing to report

    const totalCount = groups.reduce((sum, g) => sum + g.count, 0)
    const result = await sendDailyActivitySummaryEmail(farmer.email, farmer.name, groups, totalCount, dateLabel)
    if (result.success) sent++
  }

  return { success: true, sent }
}
