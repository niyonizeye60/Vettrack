import { ObjectId, type Db, type Document } from "mongodb"
import clientPromise from "./db"
import { notificationText } from "./notification-messages"
import { adminIdsAmong, notifyAdmin, notifyAdmins, type AdminAlert } from "./admin-notifications"
import { todayRwandaDateString } from "./activity-summary"

/**
 * Admin alerts about things that have been waiting too long, plus the outbreak check.
 *
 * The timed ones run from the daily cron (/api/cron/admin-alerts) and, so they don't wait
 * a whole day, from any admin who has the portal open (/api/admin/alerts/check). Each item
 * is flagged when it is alerted, so running the checks again never repeats an alert.
 *
 * Not a server action: only those two routes call it, after checking who is asking.
 */

const DB = "ntdm_animal_hospital"
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export const CONSULTATION_WAIT_HOURS = 24
export const TICKET_WAIT_HOURS = 24
export const VERIFICATION_WAIT_DAYS = 2
export const OUTBREAK_MIN_CASES = 3
export const OUTBREAK_WINDOW_DAYS = 7

/** One document per job or alert key - see claim(). */
const LOCKS = "admin_alert_locks"
/** The timed checks run at most this often, however many admins have the portal open. */
const RUN_EVERY_MS = 15 * 60 * 1000

/**
 * Claim `key` for this caller unless `stale` says the last claim is still current. True
 * for exactly one caller even when several race: the losers either miss the update or hit
 * the duplicate-key error on the insert.
 */
async function claim(db: Db, key: string, stale: Document, set: Document): Promise<boolean> {
  try {
    const result = await db
      .collection<{ _id: string }>(LOCKS)
      .updateOne({ _id: key, ...stale } as Document, { $set: set }, { upsert: true })
    return result.modifiedCount > 0 || result.upsertedCount > 0
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false
    throw error
  }
}

export interface TimedAlertsResult {
  ran: boolean
  consultations?: number
  tickets?: number
  verificationBacklog?: number
}

export async function runAdminTimedAlerts(): Promise<TimedAlertsResult> {
  const client = await clientPromise
  const db = client.db(DB)

  const slot = String(Math.floor(Date.now() / RUN_EVERY_MS))
  if (!(await claim(db, "timed-checks", { slot: { $ne: slot } }, { slot, claimedAt: new Date() }))) {
    return { ran: false }
  }

  const [consultations, tickets, verificationBacklog] = await Promise.allSettled([
    alertWaitingConsultations(db),
    alertUnansweredTickets(db),
    alertVerificationBacklog(db),
  ])
  const failed = [consultations, tickets, verificationBacklog].filter(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  )
  if (failed.length > 0) {
    // The checks that worked have flagged what they alerted; the next run retries the rest.
    throw failed[0].reason
  }

  const value = (result: PromiseSettledResult<number>) => (result.status === "fulfilled" ? result.value : 0)
  return {
    ran: true,
    consultations: value(consultations),
    tickets: value(tickets),
    verificationBacklog: value(verificationBacklog),
  }
}

/** Consultation requests no vet has accepted or declined within a day. */
async function alertWaitingConsultations(db: Db): Promise<number> {
  const cutoff = new Date(Date.now() - CONSULTATION_WAIT_HOURS * HOUR_MS)
  const consultations = db.collection("consultations")
  const waiting = await consultations
    .find(
      // null also matches a consultation saved without a status, which the portal shows as pending.
      { status: { $in: ["pending", "Pending", null] }, createdAt: { $lt: cutoff }, adminWaitAlertedAt: { $exists: false } },
      { projection: { fullName: 1, doctor: 1 } }
    )
    .sort({ createdAt: 1 })
    .toArray()
  if (waiting.length === 0) return 0

  await consultations.updateMany(
    { _id: { $in: waiting.map((c) => c._id) } },
    { $set: { adminWaitAlertedAt: new Date() } }
  )

  // A backlog (the first run, or a quiet weekend) is one alert, not one per request.
  if (waiting.length > 1) {
    await notifyAdmins(db, {
      text: notificationText("consultationsWaiting", { count: waiting.length }),
      type: "consultation",
      actionUrl: "/admin/appointments",
    })
    return waiting.length
  }

  const consultation = waiting[0]
  const vetId = consultation.doctor ? String(consultation.doctor) : ""
  const vet = ObjectId.isValid(vetId)
    ? await db.collection("users").findOne({ _id: new ObjectId(vetId) }, { projection: { name: 1 } })
    : null
  const farmer = String(consultation.fullName || "A farmer")
  await notifyAdmins(db, {
    text: vet?.name
      ? notificationText("consultationWaiting", { farmer, vet: String(vet.name) })
      : notificationText("consultationWaitingNoVet", { farmer }),
    type: "consultation",
    actionUrl: `/admin/appointments?appointment=${consultation._id.toString()}`,
  })
  return 1
}

/**
 * Support tickets whose requester has waited a day for a staff reply. `awaitingStaffSince`
 * is set when the requester writes and cleared when staff reply (app/api/support/...);
 * `staffEscalatedFor` records which wait was already alerted, so a new wait alerts again.
 */
async function alertUnansweredTickets(db: Db): Promise<number> {
  const cutoff = new Date(Date.now() - TICKET_WAIT_HOURS * HOUR_MS)
  const tickets = db.collection("supportTickets")
  const candidates = await tickets
    .find(
      {
        status: { $ne: "resolved" },
        $or: [
          { awaitingStaffSince: { $lt: cutoff } },
          // Tickets from before awaitingStaffSince was kept: "open" means no staff reply
          // since it was opened or reopened.
          { awaitingStaffSince: { $exists: false }, status: "open", lastMessageAt: { $lt: cutoff } },
        ],
      },
      { projection: { subject: 1, requesterName: 1, assignedTo: 1, awaitingStaffSince: 1, lastMessageAt: 1, staffEscalatedFor: 1 } }
    )
    .toArray()

  const waitStart = (ticket: Document) => new Date(ticket.awaitingStaffSince ?? ticket.lastMessageAt)
  const due = candidates.filter(
    (ticket) => !ticket.staffEscalatedFor || new Date(ticket.staffEscalatedFor).getTime() !== waitStart(ticket).getTime()
  )
  if (due.length === 0) return 0

  // Each update only applies if the ticket is still waiting the same way - a staff reply
  // that landed since the find above wins.
  await tickets.bulkWrite(
    due.map((ticket) => {
      const since = waitStart(ticket)
      return {
        updateOne: {
          filter: { _id: ticket._id, awaitingStaffSince: ticket.awaitingStaffSince ?? { $exists: false } },
          update: { $set: { awaitingStaffSince: since, staffEscalatedFor: since } },
        },
      }
    })
  )

  // Grouped by who should answer: the admin holding the ticket, otherwise every admin.
  const admins = await adminIdsAmong(db, due.map((ticket) => ticket.assignedTo))
  const byOwner = new Map<string, Document[]>()
  for (const ticket of due) {
    const owner = ticket.assignedTo != null && admins.has(String(ticket.assignedTo)) ? String(ticket.assignedTo) : "all"
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), ticket])
  }

  for (const [owner, group] of Array.from(byOwner.entries())) {
    const alert: AdminAlert =
      group.length === 1
        ? {
            text: notificationText("ticketWaiting", {
              subject: String(group[0].subject || ""),
              requester: String(group[0].requesterName || "A user"),
            }),
            type: "support_ticket",
            actionUrl: `/admin/support?ticketId=${group[0]._id.toString()}`,
          }
        : {
            text: notificationText("ticketsWaiting", { count: group.length }),
            type: "support_ticket",
            actionUrl: "/admin/support",
          }
    if (owner === "all") await notifyAdmins(db, alert)
    else await notifyAdmin(db, owner, alert)
  }
  return due.length
}

/** Once a Kigali day: how many farmer and vet accounts have waited over 2 days for verification. */
async function alertVerificationBacklog(db: Db): Promise<number> {
  const cutoff = new Date(Date.now() - VERIFICATION_WAIT_DAYS * DAY_MS)
  const count = await db.collection("users").countDocuments({
    role: { $in: ["farmer", "doctor"] },
    status: "pending_verification",
    createdAt: { $lt: cutoff },
  })
  if (count === 0) return 0

  const today = todayRwandaDateString()
  if (!(await claim(db, "verification-backlog", { day: { $ne: today } }, { day: today, claimedAt: new Date() }))) {
    return 0
  }

  await notifyAdmins(db, {
    text: count === 1 ? notificationText("verificationBacklogOne") : notificationText("verificationBacklog", { count }),
    type: "account",
    actionUrl: "/admin/users?status=pending_verification",
    // Replaced by tomorrow's count, so yesterday's doesn't linger next to it.
    expiresInDays: 1,
  })
  return count
}

function exactly(text: string) {
  return new RegExp(`^\\s*${text.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i")
}

/**
 * After a disease case is reported: if this makes OUTBREAK_MIN_CASES or more of the same
 * disease in the same district within OUTBREAK_WINDOW_DAYS, tell every admin - once per
 * disease and district per window. Unreviewed reports count too, since this is the early
 * warning; rejected ones don't.
 *
 * Never throws: a failed check must not fail the report.
 */
export async function checkForOutbreak(
  db: Db,
  reported: { _id: ObjectId; diseaseName: unknown; district: unknown }
): Promise<void> {
  try {
    const disease = typeof reported.diseaseName === "string" ? reported.diseaseName.trim() : ""
    const district = typeof reported.district === "string" ? reported.district.trim() : ""
    // "Other" lumps unrelated diseases together, so it can't signal an outbreak.
    if (!disease || !district || disease.toLowerCase() === "other") return

    const since = new Date(Date.now() - OUTBREAK_WINDOW_DAYS * DAY_MS)
    const count = await db.collection("epidemic_cases").countDocuments({
      diseaseName: exactly(disease),
      district: exactly(district),
      status: { $in: ["pending", "confirmed", "resolved"] },
      seeded: { $ne: true },
      reportedAt: { $gte: since },
    })
    if (count < OUTBREAK_MIN_CASES) return

    const key = `outbreak:${disease.toLowerCase()}|${district.toLowerCase()}`
    if (!(await claim(db, key, { claimedAt: { $lt: since } }, { claimedAt: new Date() }))) return

    await notifyAdmins(db, {
      text: notificationText("outbreakSuspected", { disease, district, count, days: OUTBREAK_WINDOW_DAYS }),
      type: "epidemic",
      priority: "high",
      actionUrl: `/admin/epidemics?case=${reported._id.toString()}`,
    })
  } catch (error) {
    console.error("Failed to check for a disease outbreak:", error)
  }
}
