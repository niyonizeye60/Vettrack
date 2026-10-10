import clientPromise from "./db"
import { ObjectId } from "mongodb"
import { CALF_GRADUATION_AGE_MONTHS, isReadyToGraduate } from "./calf-age"
import { notificationText } from "./notification-messages"

const DB = "ntdm_animal_hospital"

/**
 * Tell farmers when a calf is old enough to move into the animals herd.
 *
 * The move itself stays manual - the Move to Animals dialog on /farmer/calves - because
 * it needs the ear tag, insurance ID, class and weight, which only the farmer knows.
 * This only makes sure they hear about it: the calves page already shows due calves
 * as a banner, so the notification is for farmers who aren't on that page.
 *
 * Each calf is stamped graduationReminderSentAt the first time it is mentioned and is
 * never mentioned again, so both callers below can run as often as they like. The
 * stamp is claimed per calf before notifying, so two overlapping runs (the cron and a
 * page load, or two open tabs) can't both announce the same calf.
 */
async function notifyDueCalves(scope: { farmerId?: string }) {
  const client = await clientPromise
  const db = client.db(DB)
  const now = new Date()

  // Age can't be expressed as a plain query on the stored YYYY-MM-DD string without
  // duplicating the month arithmetic, so it's checked in code with the same helper the
  // page uses. The candidates are only calves not yet announced, which after the first
  // run means calves still under the threshold - a small set.
  const candidates = await db.collection("calves").find(
    {
      ...(scope.farmerId ? { farmerId: scope.farmerId } : {}),
      status: { $in: ["active", "weaned"] },
      graduatedAt: { $exists: false },
      graduationReminderSentAt: { $exists: false },
    },
    { projection: { farmerId: 1, name: 1, status: 1, birthDate: 1 } }
  ).toArray()

  const byFarmer = new Map<string, typeof candidates>()
  for (const calf of candidates) {
    if (!isReadyToGraduate({ status: calf.status, birthDate: calf.birthDate }, now) || !ObjectId.isValid(calf.farmerId)) continue
    byFarmer.set(calf.farmerId, [...(byFarmer.get(calf.farmerId) || []), calf])
  }

  let notified = 0
  for (const [farmerId, calves] of Array.from(byFarmer)) {
    const names: string[] = []
    for (const calf of calves) {
      const claim = await db.collection("calves").updateOne(
        { _id: calf._id, graduationReminderSentAt: { $exists: false } },
        { $set: { graduationReminderSentAt: now } }
      )
      if (claim.modifiedCount) names.push(calf.name || "A calf")
    }
    if (names.length === 0) continue

    const months = CALF_GRADUATION_AGE_MONTHS
    await db.collection("notifications").insertOne({
      ...(names.length === 1
        ? notificationText("calfReady", { names: names[0], months })
        : names.length > 5
          ? notificationText("calvesReadyMore", { names: names.slice(0, 5).join(", "), more: names.length - 5, months })
          : notificationText("calvesReady", { names: names.join(", "), months })),
      type: "calves",
      priority: "normal",
      read: false,
      deletedBy: [],
      userId: new ObjectId(farmerId),
      actionUrl: "/farmer/calves",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    }).then(() => { notified++ })
      .catch((err: unknown) => console.error("Error inserting calf graduation notification:", err))
  }

  return { success: true, notified }
}

/** Cron sweep across every farm (app/api/cron/calf-graduation-reminders/route.ts). */
export function sendCalfGraduationReminders() {
  return notifyDueCalves({})
}

/**
 * Session-triggered check for one farmer, called from useCalfGraduationReminders while
 * the farmer has the app open - the same belt-and-braces as the insemination reminders
 * (see lib/actions/insemination-reminders.ts), so the prompt doesn't depend on Vercel
 * Cron firing.
 */
export function checkCalfGraduationRemindersForFarmer(farmerId: string) {
  return notifyDueCalves({ farmerId })
}
