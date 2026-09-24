"use server"

import clientPromise from "../db"
import { ObjectId } from "mongodb"
import { sendDailyActivitySummaryEmail } from "../email"
import { todayRwandaRange, todayRwandaDateString, currentRwandaHour, buildActivitySummaryGroups } from "../activity-summary"

const DB = "ntdm_animal_hospital"

// The digest used to only fire from Vercel Cron at 7:30 PM Kigali (30 17 * * *,
// UTC). Session-triggered sends (see sendDailyActivitySummaryForFarmer) aren't on
// a schedule, so this gate keeps them from firing while the farmer's day is still
// in progress - anything before 7 PM is treated as "too early".
const SEND_CUTOFF_HOUR_KIGALI = 19

function dateLabelFor(dateString: string) {
  return new Date(`${dateString}T00:00:00.000+02:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Cron sweep (app/api/cron/daily-summary/route.ts) - depends on Vercel actually
 * invoking it, which needs CRON_SECRET set in the Production environment. Kept as
 * a catch-all, but sendDailyActivitySummaryForFarmer below is the primary path:
 * it piggybacks on ordinary farmer traffic the same way the ThingSpeak temperature
 * alert does (app/api/thingspeak/route.ts), so it works even if the cron infra
 * doesn't. Both paths mark users.dailySummaryEmailSentFor so neither double-sends
 * on a day the other already handled.
 */
export async function sendDailyActivitySummaries() {
  const client = await clientPromise
  const db = client.db(DB)

  const { start, end } = todayRwandaRange()
  const today = todayRwandaDateString()

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
    { projection: { name: 1, email: 1, dailySummaryEmailSentFor: 1 } }
  ).toArray()

  const dateLabel = dateLabelFor(today)

  let sent = 0
  for (const farmer of farmers) {
    if (farmer.dailySummaryEmailSentFor === today) continue

    const farmerLogs = logsByFarmer.get(farmer._id.toString())
    if (!farmerLogs || farmerLogs.length === 0 || !farmer.email) continue

    const groups = buildActivitySummaryGroups(farmerLogs as any)
    if (groups.length === 0) continue // only session/account events today - nothing to report

    const totalCount = groups.reduce((sum, g) => sum + g.count, 0)
    const result = await sendDailyActivitySummaryEmail(farmer.email, farmer.name, groups, totalCount, dateLabel)
    if (result.success) {
      sent++
      await db.collection("users").updateOne({ _id: farmer._id }, { $set: { dailySummaryEmailSentFor: today } })
    }
  }

  return { success: true, sent }
}

/**
 * The primary send path. Called from the client (useDailySummaryEmail) whenever a
 * logged-in farmer has a page open at or after the digest cutoff - exactly how the
 * ThingSpeak route emails a temperature alert off the back of an ordinary poll
 * instead of a scheduled job. Safe to call repeatedly: it no-ops before the
 * cutoff, and is idempotent per Kigali day via dailySummaryEmailSentFor so
 * multiple tabs, repeated polls, or the cron sweep can never double-send.
 */
export async function sendDailyActivitySummaryForFarmer(farmerId: string) {
  if (currentRwandaHour() < SEND_CUTOFF_HOUR_KIGALI) {
    return { success: true, sent: false, reason: "before cutoff" }
  }

  const client = await clientPromise
  const db = client.db(DB)
  const today = todayRwandaDateString()

  const farmer = await db.collection("users").findOne(
    { _id: new ObjectId(farmerId), role: "farmer" },
    { projection: { name: 1, email: 1, dailySummaryEmailSentFor: 1 } }
  )
  if (!farmer || !farmer.email) return { success: true, sent: false, reason: "no farmer or email on file" }
  if (farmer.dailySummaryEmailSentFor === today) return { success: true, sent: false, reason: "already sent" }

  const { start, end } = todayRwandaRange()
  const logs = await db.collection("user_activity_logs")
    .find({ userId: new ObjectId(farmerId), createdAt: { $gte: start, $lte: end } })
    .toArray()

  const groups = buildActivitySummaryGroups(logs as any)
  if (groups.length === 0) {
    return { success: true, sent: false, reason: "no tracked activity today" }
  }

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0)
  const result = await sendDailyActivitySummaryEmail(farmer.email, farmer.name, groups, totalCount, dateLabelFor(today))
  if (result.success) {
    await db.collection("users").updateOne({ _id: farmer._id }, { $set: { dailySummaryEmailSentFor: today } })
  }
  return { success: true, sent: result.success }
}
