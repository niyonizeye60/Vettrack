export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import type { Db } from "mongodb"
import clientPromise, { withDbRetry } from "@/lib/db"
import { getOfflineFarmer } from "@/lib/offline-farmer"
import { POST as saveMilk } from "@/app/api/milk/route"
import { POST as saveDisease } from "@/app/api/diseases/route"
import { POST as saveDose } from "@/app/api/treatment-doses/route"
import { POST as saveVaccination } from "@/app/api/vaccination/route"
import { POST as saveInsemination } from "@/app/api/insemination/route"
import { POST as saveCalf } from "@/app/api/calves/route"
import { POST as saveCalfWeight } from "@/app/api/calf-weights/route"

const DB = "ntdm_animal_hospital"
const SUBMISSIONS = "offline_submissions"
// A send still unfinished after this long is taken to have died part-way, and is redone.
const CLAIM_TIMEOUT_MS = 2 * 60 * 1000
// How long a sent record is remembered, so the phone sending it again can't add it twice.
const KEEP_DAYS = 90
const ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/
// A record made offline can point at another one made offline (a dose for a new
// disease case, a weight for a new calf) as "offline:<its id>".
const REF_PREFIX = "offline:"

type Save = (request: NextRequest) => Promise<Response>

/**
 * Each kind is saved by the same route the app's own form posts to, so the checks,
 * the on-farm location rule and the side effects are exactly those of saving online.
 * `refs` are the fields that may point at a record made offline.
 */
const KINDS: Record<string, { path: string; save: Save; refs?: string[] }> = {
  milk: { path: "/api/milk", save: saveMilk },
  disease: { path: "/api/diseases", save: saveDisease },
  dose: { path: "/api/treatment-doses", save: saveDose, refs: ["diseaseRecordId"] },
  vaccination: { path: "/api/vaccination", save: saveVaccination, refs: ["subjectId"] },
  insemination: { path: "/api/insemination", save: saveInsemination },
  calf: { path: "/api/calves", save: saveCalf },
  calfWeight: { path: "/api/calf-weights", save: saveCalfWeight, refs: ["calfId"] },
}

interface Submission {
  _id: string
  userId: string
  kind: string
  status: "sending" | "done"
  claimedAt: Date
  enteredAt: Date | null
  recordId?: string
  doneAt?: Date
}

/**
 * Saves one record a farmer made on their phone with no connection. public/sw.js
 * sends them one at a time, oldest first, and acts on the answer:
 *
 * - 200: saved (or saved already - a record is never added twice)
 * - 401 / 403: signed out or not allowed; the phone keeps everything for later
 * - 409 WRONG_USER: made by someone else signed in on this phone; kept for them
 * - 409 RETRY: try again shortly (being sent already, or waiting for a record it needs)
 * - 422: refused for a reason the farmer has to see, such as a wrong location
 * - 500 / 503: a problem on our side; tried again later
 */
export async function POST(request: NextRequest) {
  try {
    const db = (await clientPromise).db(DB)
    const farmer = await getOfflineFarmer(db)
    if (farmer.status !== 200) {
      return NextResponse.json({ error: farmer.status === 401 ? "Unauthorized" : "Forbidden" }, { status: farmer.status })
    }
    const userId = farmer.user._id.toString()

    const entry = await request.json().catch(() => null)
    const kind = entry && typeof entry.kind === "string" && Object.hasOwn(KINDS, entry.kind) ? KINDS[entry.kind] : null
    if (!kind || typeof entry.id !== "string" || !ID_PATTERN.test(entry.id) || !isObject(entry.body)) {
      return refused("Invalid request")
    }
    if (entry.userId !== userId) {
      return NextResponse.json({ error: "Made by someone else on this phone", code: "WRONG_USER" }, { status: 409 })
    }

    await ensureIndexes(db)
    const claim = await claimEntry(db, entry.id, userId, entry.kind, entry.createdAt)
    if (claim === "other-user") return refused("Invalid request")
    if (claim === "busy") return retry()
    if (claim !== "claimed") return saved(claim.recordId)

    let release = true
    try {
      const body = { ...entry.body }
      for (const field of kind.refs || []) {
        const value = body[field]
        if (typeof value !== "string" || !value.startsWith(REF_PREFIX)) continue
        const parent = await withDbRetry(() =>
          db.collection<Submission>(SUBMISSIONS).findOne({ _id: value.slice(REF_PREFIX.length), userId, status: "done" })
        )
        // Sent in order, so this is rare: the record it needs is still on its way.
        if (!parent?.recordId) return retry()
        body[field] = parent.recordId
      }

      const res = await kind.save(
        new NextRequest(new URL(kind.path, request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      )
      const data = await res.json().catch(() => ({}))

      let recordId: string | null = res.ok && typeof data.id === "string" ? data.id : null
      if (!recordId && entry.kind === "milk" && res.status === 409) recordId = await sameMilking(db, body)
      if (recordId) {
        // Saved: from here on a retry must find this, not save the record again.
        release = false
        await withDbRetry(() =>
          db.collection<Submission>(SUBMISSIONS).updateOne(
            { _id: entry.id },
            { $set: { status: "done", recordId, doneAt: new Date() } }
          )
        )
        return saved(recordId)
      }

      // The session was checked above, so a 401 here was a passing database problem.
      if (res.status >= 500 || res.status === 401) {
        return NextResponse.json({ error: data.error || "Failed to save record" }, { status: 503 })
      }
      return refused(typeof data.error === "string" ? data.error : "Failed to save record", data.code)
    } finally {
      if (release) {
        await db.collection<Submission>(SUBMISSIONS).deleteOne({ _id: entry.id, status: "sending" }).catch(() => {})
      }
    }
  } catch (error) {
    console.error("Error saving an offline record:", error)
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 })
  }
}

function saved(recordId: string) {
  return NextResponse.json({ success: true, id: recordId })
}

function retry() {
  return NextResponse.json({ error: "Try again shortly", code: "RETRY" }, { status: 409 })
}

function refused(error: string, code?: unknown) {
  return NextResponse.json({ error, ...(typeof code === "string" ? { code } : {}) }, { status: 422 })
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Marks a record as being sent, so the same record sent twice (the phone didn't hear
 * back the first time) is saved once. Returns the saved record's id when it has been.
 */
async function claimEntry(
  db: Db,
  id: string,
  userId: string,
  kind: string,
  enteredAt: unknown
): Promise<"claimed" | "busy" | "other-user" | { recordId: string }> {
  const submissions = db.collection<Submission>(SUBMISSIONS)
  const entered = typeof enteredAt === "string" && !isNaN(Date.parse(enteredAt)) ? new Date(enteredAt) : null
  try {
    await submissions.insertOne({ _id: id, userId, kind, status: "sending", claimedAt: new Date(), enteredAt: entered })
    return "claimed"
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error
  }

  const existing = await withDbRetry(() => submissions.findOne({ _id: id }))
  if (!existing) return "busy"
  if (existing.userId !== userId) return "other-user"
  if (existing.status === "done" && existing.recordId) return { recordId: existing.recordId }
  const stale = await withDbRetry(() =>
    submissions.updateOne(
      { _id: id, status: "sending", claimedAt: { $lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) } },
      { $set: { claimedAt: new Date() } }
    )
  )
  return stale.modifiedCount === 1 ? "claimed" : "busy"
}

/**
 * The milk route refuses a second record for the same cow, session and day. When the
 * one already there has the same litres, it is this record, saved by an earlier send
 * whose answer never reached the phone.
 */
async function sameMilking(db: Db, body: Record<string, unknown>): Promise<string | null> {
  const existing = await withDbRetry(() =>
    db.collection("milk_records").findOne({ farmerId: body.farmerId, cowId: body.cowId, date: body.date, session: body.session })
  )
  return existing && Number(existing.liters) === Number(body.liters) ? existing._id.toString() : null
}

// Ensured once per warm process. A failure only means sent records are kept longer.
let indexesEnsured = false
async function ensureIndexes(db: Db) {
  if (indexesEnsured) return
  try {
    await db.collection(SUBMISSIONS).createIndex({ doneAt: 1 }, { expireAfterSeconds: KEEP_DAYS * 24 * 60 * 60 })
    indexesEnsured = true
  } catch (error) {
    console.error("Failed to ensure index on offline_submissions:", error)
  }
}
