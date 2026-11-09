import clientPromise from "./db"
import { ObjectId, type Db, type Document } from "mongodb"
import { addDays, isDateString, kigaliToday } from "./product-rules"
import { errorMessage } from "./error-messages"
import {
  MAX_FEEDING_PLAN_DAYS,
  RATION_FIELDS,
  canGetFeedRecords,
  feedingTypeOf,
  planDayCount,
  rationTotal,
  type FeedingRation,
} from "./feeding-plan-rules"

const DB = "ntdm_animal_hospital"
const PLANS = "feeding_plans"
const EXPENSES = "animal_expenses"

/**
 * Feeding plans: the farmer sets a daily ration for chosen animals over a period, and the
 * feed records are written for them, so a farmer who was away comes back to the days
 * already recorded on the Animal Expenses tab.
 *
 * Records are written one day at a time, never ahead. A record for tomorrow would show
 * feeding that hasn't happened, and a plan that changes (an animal sold, the plan
 * stopped) would leave future records to delete by hand. Each run writes every day from
 * the day after `recordedThrough` up to today, so a missed run leaves no gap, and then
 * moves `recordedThrough` on. Days at or before it are never written again: a record
 * the farmer edited or deleted stays the way they left it.
 *
 * Two callers run this, and they may overlap: the daily cron sweep
 * (app/api/cron/feeding-plans) and a check for one farmer whenever they have the app open
 * (app/api/farmer/feeding-plans/check), so recording doesn't depend on Vercel Cron
 * firing. A unique index on (feedingPlanId, animalId, date) keeps overlapping runs from
 * writing a day twice.
 *
 * On each day, an animal is skipped if it is no longer on the farm, has died, or is a
 * lactating cow (her feed is recorded in Milk Production), and on any day the farmer
 * already recorded its feeding by hand.
 */

export interface FeedingPlanAnimal {
  animalId: string
  animalName: string | null
  /** The animal's type when the plan was made - the ration it gets. */
  animalType: string
}

export interface FeedingPlanDoc {
  _id: ObjectId
  farmerId: string
  startDate: string
  endDate: string
  time: string | null
  notes: string | null
  animals: FeedingPlanAnimal[]
  rations: Record<string, FeedingRation>
  status: "active" | "stopped" | "finished"
  /** The last day whose records were written; null until the first day is. */
  recordedThrough: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  stoppedAt?: Date
  finishedAt?: Date
}

type Failure = { ok: false; status: number; error: string }

/** canGetFeedRecords for a raw animal document. */
const isFed = (animal: Document) =>
  canGetFeedRecords({ type: animal.type, lactationStatus: animal.lactationStatus, status: animal.status })

const ownedBy = (farmerId: string) => [{ ownerId: farmerId }, { "owner._id": farmerId }, { owner: farmerId }]

async function getDb() {
  const client = await clientPromise
  return client.db(DB)
}

/**
 * Ensured once per warm process - createIndex is a no-op after the first call. Unlike the
 * income and payout indexes this one throws: without it two overlapping runs could write
 * the same day twice, so recording waits until it exists.
 */
let indexesEnsured = false
async function ensureIndexes(db: Db) {
  if (indexesEnsured) return
  await db.collection(EXPENSES).createIndex(
    { feedingPlanId: 1, animalId: 1, date: 1 },
    { unique: true, partialFilterExpression: { feedingPlanId: { $type: "string" } } }
  )
  await db.collection(PLANS).createIndex({ farmerId: 1, status: 1 })
  await db.collection(PLANS).createIndex({ status: 1 })
  indexesEnsured = true
}

/** Insert records, ignoring the ones an overlapping run already wrote. */
async function insertNewRecords(db: Db, records: Record<string, unknown>[]) {
  try {
    await db.collection(EXPENSES).insertMany(records, { ordered: false })
  } catch (error: any) {
    const writeErrors = error?.writeErrors
    const errors = Array.isArray(writeErrors) ? writeErrors : writeErrors ? [writeErrors] : []
    const duplicatesOnly = errors.length > 0
      ? errors.every((e: any) => e?.code === 11000)
      : error?.code === 11000
    if (!duplicatesOnly) throw error
  }
}

/** Write the plan's days that are due and move recordedThrough on. Returns how many records were written. */
async function recordPlan(db: Db, plan: FeedingPlanDoc, today: string, now: Date): Promise<number> {
  const from = plan.recordedThrough ? addDays(plan.recordedThrough, 1) : plan.startDate
  const through = plan.endDate < today ? plan.endDate : today
  let written = 0

  if (from <= through) {
    const days: string[] = []
    for (let day = from; day <= through; day = addDays(day, 1)) days.push(day)

    const ids = plan.animals.map(a => a.animalId).filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id))
    const onFarm = await db.collection("animals").find(
      { _id: { $in: ids }, $or: ownedBy(plan.farmerId) },
      { projection: { name: 1, type: 1, lactationStatus: 1, status: 1 } }
    ).toArray()
    const fed = onFarm.filter(isFed)
    const fedIds = fed.map(a => a._id.toString())

    // Days the farmer already recorded this animal's feeding by hand are left alone, so
    // the cost isn't counted twice.
    const existing = fedIds.length === 0 ? [] : await db.collection(EXPENSES).find(
      { farmerId: plan.farmerId, animalId: { $in: fedIds }, expenseType: "feed", date: { $gte: from, $lte: through } },
      { projection: { animalId: 1, date: 1 } }
    ).toArray()
    const taken = new Set(existing.map(e => `${e.animalId}|${e.date}`))

    const planAnimals = new Map(plan.animals.map(a => [a.animalId, a]))
    const planId = plan._id.toString()
    const records: Record<string, unknown>[] = []
    for (const animal of fed) {
      const animalId = animal._id.toString()
      const ration = plan.rations[planAnimals.get(animalId)?.animalType ?? ""]
      const amount = rationTotal(ration)
      if (!ration || amount <= 0) continue
      for (const date of days) {
        if (taken.has(`${animalId}|${date}`)) continue
        records.push({
          farmerId: plan.farmerId,
          animalId,
          animalName: animal.name || planAnimals.get(animalId)?.animalName || null,
          expenseType: "feed",
          description: null,
          amount,
          date,
          notes: plan.notes,
          time: plan.time,
          foodKg: ration.foodKg,
          foodCost: ration.foodCost,
          waterLiters: ration.waterLiters,
          waterCost: ration.waterCost,
          saltKg: ration.saltKg,
          saltCost: ration.saltCost,
          feedingPlanId: planId,
          createdAt: now,
        })
      }
    }
    if (records.length > 0) await insertNewRecords(db, records)
    written = records.length
  }

  const finished = through >= plan.endDate
  if (from <= through || finished) {
    // Conditional on the cursor it started from, so a slower overlapping run can't move
    // it back, on the plan still being active, so a stop made meanwhile stands, and on
    // the end date it read, so an edit extending the plan meanwhile doesn't get finished.
    await db.collection<FeedingPlanDoc>(PLANS).updateOne(
      { _id: plan._id, status: "active", recordedThrough: plan.recordedThrough, endDate: plan.endDate },
      {
        $set: {
          recordedThrough: from <= through ? through : plan.recordedThrough,
          updatedAt: now,
          ...(finished ? { status: "finished" as const, finishedAt: now } : {}),
        },
      }
    )
  }
  return written
}

async function recordDueFeedings(scope: { farmerId?: string }) {
  const db = await getDb()
  await ensureIndexes(db)
  const now = new Date()
  const today = kigaliToday(now)

  const plans = await db.collection<FeedingPlanDoc>(PLANS).find({
    ...(scope.farmerId ? { farmerId: scope.farmerId } : {}),
    status: "active",
    startDate: { $lte: today },
    $or: [{ recordedThrough: null }, { recordedThrough: { $lt: today } }],
  }).toArray()

  // One plan failing mustn't stop the others; the failure is reported once they've run.
  let recorded = 0
  const failures: string[] = []
  for (const plan of plans) {
    try {
      recorded += await recordPlan(db, plan, today, now)
    } catch (error) {
      console.error(`Error recording feeding plan ${plan._id}:`, error)
      failures.push(`${plan._id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${plans.length} feeding plans failed to record - ${failures.join("; ")}`)
  }
  return { success: true, plans: plans.length, recorded }
}

/** Cron sweep across every farm (app/api/cron/feeding-plans/route.ts). */
export function recordAllDueFeedings() {
  return recordDueFeedings({})
}

/** Catch-up for one farmer while they have the app open (app/api/farmer/feeding-plans/check). */
export function recordDueFeedingsForFarmer(farmerId: string) {
  return recordDueFeedings({ farmerId })
}

export interface FeedingPlanView extends Omit<FeedingPlanDoc, "_id"> {
  _id: string
}

/** The farmer's plans, newest first - running and upcoming ones, plus the last few that ended. */
export async function listFeedingPlans(farmerId: string): Promise<FeedingPlanView[]> {
  const db = await getDb()
  const plans = await db.collection<FeedingPlanDoc>(PLANS)
    .find({ farmerId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()
  const active = plans.filter(p => p.status === "active")
  const ended = plans.filter(p => p.status !== "active").slice(0, 10)
  return [...active, ...ended].map(p => ({ ...p, _id: p._id.toString() }))
}

function parseRation(raw: unknown): FeedingRation | null {
  if (!raw || typeof raw !== "object") return null
  const ration = {} as FeedingRation
  for (const field of RATION_FIELDS) {
    const value = (raw as Record<string, unknown>)[field]
    if (value === "" || value === null || value === undefined) {
      ration[field] = null
      continue
    }
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return null
    ration[field] = n || null
  }
  return ration
}

export interface CreateFeedingPlanInput {
  farmerId: string
  startDate: unknown
  endDate: unknown
  time: unknown
  notes: unknown
  animalIds: unknown
  rations: unknown
}

export type UpdateFeedingPlanInput = Omit<CreateFeedingPlanInput, "farmerId">

function parseTimeAndNotes(input: UpdateFeedingPlanInput) {
  return {
    time: typeof input.time === "string" && /^\d{2}:\d{2}$/.test(input.time) ? input.time : null,
    notes: typeof input.notes === "string" && input.notes.trim() ? input.notes.trim().slice(0, 500) : null,
  }
}

function parseAnimalIds(raw: unknown): { ok: true; ids: string[] } | Failure {
  const ids = Array.isArray(raw)
    ? Array.from(new Set(raw.filter((id): id is string => typeof id === "string")))
    : []
  if (ids.length === 0) return { ok: false, status: 400, error: errorMessage("feedingPlanNoAnimals") }
  if (ids.length > 1000 || !ids.every(id => ObjectId.isValid(id))) {
    return { ok: false, status: 400, error: errorMessage("invalidRequest") }
  }
  return { ok: true, ids }
}

/** Animals joining a plan: they must be on this farm and be getting feed records now. */
async function loadJoiningAnimals(
  db: Db,
  farmerId: string,
  ids: string[]
): Promise<{ ok: true; animals: FeedingPlanAnimal[] } | Failure> {
  if (ids.length === 0) return { ok: true, animals: [] }
  const found = await db.collection("animals").find(
    { _id: { $in: ids.map(id => new ObjectId(id)) }, $or: ownedBy(farmerId) },
    { projection: { name: 1, type: 1, lactationStatus: 1, status: 1 } }
  ).toArray()
  if (found.length !== ids.length) {
    return { ok: false, status: 403, error: errorMessage("thatAnimalIsNotOnThisFarm") }
  }
  const notFed = found.find(a => !isFed(a))
  if (notFed) {
    return { ok: false, status: 400, error: errorMessage("feedingPlanAnimalNotFed", { animal: notFed.name || "This animal" }) }
  }
  return {
    ok: true,
    animals: found.map(a => ({
      animalId: a._id.toString(),
      animalName: typeof a.name === "string" ? a.name : null,
      animalType: feedingTypeOf(a.type),
    })),
  }
}

/**
 * Only the rations of the types in the plan are kept, and each needs a cost - the same
 * rule as a feed record entered by hand. `stored` is an edited plan's current rations,
 * for a type the form has no ration box for because its animals aren't selectable now.
 */
function buildRations(
  animals: FeedingPlanAnimal[],
  raw: unknown,
  stored: Record<string, FeedingRation> = {}
): { ok: true; rations: Record<string, FeedingRation> } | Failure {
  const sent = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
  const rations: Record<string, FeedingRation> = {}
  for (const type of Array.from(new Set(animals.map(a => a.animalType)))) {
    const ration = parseRation(sent[type] ?? stored[type])
    if (!ration || rationTotal(ration) <= 0) {
      return { ok: false, status: 400, error: errorMessage("feedingPlanRationRequired") }
    }
    rations[type] = ration
  }
  return { ok: true, rations }
}

/** Two running plans for the same animal and day would record its feeding twice. */
async function findOverlap(
  db: Db,
  farmerId: string,
  from: string,
  to: string,
  animals: FeedingPlanAnimal[],
  exceptPlan?: ObjectId
): Promise<Failure | null> {
  const ids = animals.map(a => a.animalId)
  const overlapping = await db.collection<FeedingPlanDoc>(PLANS).findOne({
    farmerId,
    status: "active",
    ...(exceptPlan ? { _id: { $ne: exceptPlan } } : {}),
    startDate: { $lte: to },
    endDate: { $gte: from },
    "animals.animalId": { $in: ids },
  })
  if (!overlapping) return null
  const shared = overlapping.animals.find(a => ids.includes(a.animalId))
  const name = animals.find(a => a.animalId === shared?.animalId)?.animalName || shared?.animalName || "This animal"
  return { ok: false, status: 409, error: errorMessage("feedingPlanOverlap", { animal: name }) }
}

export async function createFeedingPlan(
  input: CreateFeedingPlanInput,
  actorId: string
): Promise<{ ok: true; id: string; recorded: number } | Failure> {
  const { farmerId, startDate, endDate } = input
  const today = kigaliToday()
  if (!isDateString(startDate) || !isDateString(endDate) || startDate < today || endDate < startDate) {
    return { ok: false, status: 400, error: errorMessage("feedingPlanDates") }
  }
  if (planDayCount(startDate, endDate) > MAX_FEEDING_PLAN_DAYS) {
    return { ok: false, status: 400, error: errorMessage("feedingPlanTooLong", { days: MAX_FEEDING_PLAN_DAYS }) }
  }
  const { time, notes } = parseTimeAndNotes(input)
  const parsedIds = parseAnimalIds(input.animalIds)
  if (!parsedIds.ok) return parsedIds

  const db = await getDb()
  const joining = await loadJoiningAnimals(db, farmerId, parsedIds.ids)
  if (!joining.ok) return joining
  const built = buildRations(joining.animals, input.rations)
  if (!built.ok) return built
  const overlap = await findOverlap(db, farmerId, startDate, endDate, joining.animals)
  if (overlap) return overlap

  const now = new Date()
  const plan: Omit<FeedingPlanDoc, "_id"> = {
    farmerId,
    startDate,
    endDate,
    time,
    notes,
    animals: joining.animals,
    rations: built.rations,
    status: "active",
    recordedThrough: null,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection(PLANS).insertOne(plan)

  // A plan starting today gets today's records straight away. The plan is saved either
  // way: if this fails, the next run writes the day.
  let recorded = 0
  try {
    recorded = (await recordDueFeedings({ farmerId })).recorded
  } catch (error) {
    console.error("Error recording a new feeding plan:", error)
  }
  return { ok: true, id: result.insertedId.toString(), recorded }
}

/**
 * Edit a running or upcoming plan. Days already recorded are never touched: the days due
 * are written first, as the plan stood when they came, and the edit reaches only the days
 * after them. So a plan that has started keeps its start date, and its end can't move
 * before today (Stop Plan is how to end it now).
 *
 * An animal already in the plan stays unless it was unticked, even if it can't be fed
 * right now: a lactating cow has no checkbox on the form, and an edit mustn't quietly
 * drop her. The run skips her while she's lactating, as it always does.
 */
export async function updateFeedingPlan(
  planId: string,
  input: UpdateFeedingPlanInput,
  actor: { _id: string; isStaff: boolean }
): Promise<{ ok: true; recorded: number } | Failure> {
  if (!ObjectId.isValid(planId)) return { ok: false, status: 400, error: errorMessage("invalidId") }
  const db = await getDb()
  const plans = db.collection<FeedingPlanDoc>(PLANS)
  const found = await plans.findOne({ _id: new ObjectId(planId) })
  if (!found) return { ok: false, status: 404, error: errorMessage("feedingPlanNotFound") }
  if (!actor.isStaff && found.farmerId !== actor._id) return { ok: false, status: 403, error: errorMessage("forbidden") }
  if (found.status !== "active") return { ok: false, status: 409, error: errorMessage("feedingPlanEnded") }

  try {
    await recordDueFeedings({ farmerId: found.farmerId })
  } catch (error) {
    console.error("Error recording a feeding plan before editing it:", error)
  }
  // Read again: that moved the cursor, and may have finished the plan.
  const plan = await plans.findOne({ _id: found._id, status: "active" })
  if (!plan) return { ok: false, status: 409, error: errorMessage("feedingPlanEnded") }

  const { startDate, endDate } = input
  const today = kigaliToday()
  const started = plan.startDate <= today
  if (
    !isDateString(startDate) || !isDateString(endDate) ||
    (started ? startDate !== plan.startDate : startDate < today) ||
    endDate < startDate || endDate < today
  ) {
    return { ok: false, status: 400, error: errorMessage("feedingPlanDates") }
  }
  if (planDayCount(startDate, endDate) > MAX_FEEDING_PLAN_DAYS) {
    return { ok: false, status: 400, error: errorMessage("feedingPlanTooLong", { days: MAX_FEEDING_PLAN_DAYS }) }
  }
  const { time, notes } = parseTimeAndNotes(input)
  const parsedIds = parseAnimalIds(input.animalIds)
  if (!parsedIds.ok) return parsedIds

  const inPlan = new Set(plan.animals.map(a => a.animalId))
  const joining = await loadJoiningAnimals(db, plan.farmerId, parsedIds.ids.filter(id => !inPlan.has(id)))
  if (!joining.ok) return joining
  const animals = [...plan.animals.filter(a => parsedIds.ids.includes(a.animalId)), ...joining.animals]
  const built = buildRations(animals, input.rations, plan.rations)
  if (!built.ok) return built

  // Only the days still to come can clash: an animal in another plan that ends today can
  // join this one from tomorrow.
  const from = plan.recordedThrough ? addDays(plan.recordedThrough, 1) : startDate
  const overlap = await findOverlap(db, plan.farmerId, from, endDate, animals, plan._id)
  if (overlap) return overlap

  // Conditional on the cursor, so a run that wrote a day since the read above can't leave
  // records before a start date moved later.
  const updated = await plans.updateOne(
    { _id: plan._id, status: "active", recordedThrough: plan.recordedThrough },
    { $set: { startDate, endDate, time, notes, animals, rations: built.rations, updatedAt: new Date() } }
  )
  if (updated.matchedCount === 0) return { ok: false, status: 409, error: errorMessage("feedingPlanChanged") }

  // An upcoming plan moved to start today gets today's records straight away.
  let recorded = 0
  try {
    recorded = (await recordDueFeedings({ farmerId: plan.farmerId })).recorded
  } catch (error) {
    console.error("Error recording an edited feeding plan:", error)
  }
  return { ok: true, recorded }
}

/**
 * Stop a plan early. Its records so far stay; no more are written. Due days are written
 * first, so a day the runs missed isn't lost by stopping.
 */
export async function stopFeedingPlan(
  planId: string,
  actor: { _id: string; isStaff: boolean }
): Promise<{ ok: true } | Failure> {
  if (!ObjectId.isValid(planId)) return { ok: false, status: 400, error: errorMessage("invalidId") }
  const db = await getDb()
  const plan = await db.collection<FeedingPlanDoc>(PLANS).findOne({ _id: new ObjectId(planId) })
  if (!plan) return { ok: false, status: 404, error: errorMessage("feedingPlanNotFound") }
  if (!actor.isStaff && plan.farmerId !== actor._id) return { ok: false, status: 403, error: errorMessage("forbidden") }
  if (plan.status !== "active") return { ok: false, status: 409, error: errorMessage("feedingPlanEnded") }

  try {
    await recordDueFeedings({ farmerId: plan.farmerId })
  } catch (error) {
    console.error("Error recording a feeding plan before stopping it:", error)
  }

  const now = new Date()
  const stopped = await db.collection<FeedingPlanDoc>(PLANS).updateOne(
    { _id: plan._id, status: "active" },
    { $set: { status: "stopped", stoppedAt: now, updatedAt: now } }
  )
  // It may have finished on its own while the due days were written.
  if (stopped.modifiedCount === 0) return { ok: false, status: 409, error: errorMessage("feedingPlanEnded") }
  return { ok: true }
}
