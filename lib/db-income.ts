import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { INCOME_SOURCES, type IncomeSource } from "@/lib/income-sources"

const DB_NAME = "ntdm_animal_hospital"

/**
 * One line in Vettrack's income ledger.
 *
 * `grossAmount` is what changed hands; `platformRevenue` is what Vettrack keeps.
 * They are equal for Vettrack's own stock and wildly different for a brokered animal
 * - see BROKERED_SOURCES. Every total on the dashboard sums platformRevenue.
 */
export interface IncomeEntry {
  _id: ObjectId
  sourceType: IncomeSource
  /** The order, consultation or subscription this came from. Unique per sourceType. */
  sourceId: string
  grossAmount: number
  platformRevenue: number
  /** The commission rate in force at the time, frozen so later changes can't move history. */
  feeRate: number | null
  currency: "RWF"
  buyerName: string | null
  buyerPhone: string | null
  sellerId: string | null
  /** Human-readable, for the reference column in the transactions table. */
  reference: string
  occurredAt: Date
  createdAt: Date
  reversedAt: Date | null
}

export interface RecordIncomeInput {
  sourceType: IncomeSource
  sourceId: string
  grossAmount: number
  platformRevenue: number
  feeRate?: number | null
  buyerName?: string | null
  buyerPhone?: string | null
  sellerId?: string | null
  reference: string
  occurredAt?: Date
}

async function getDb() {
  const client = await clientPromise
  return client.db(DB_NAME)
}

async function getCollection() {
  const db = await getDb()
  return db.collection<IncomeEntry>("income_entries")
}

/**
 * The unique index on (sourceType, sourceId) is the backstop that makes income
 * booking safe.
 *
 * Both payment gateways can deliver the same confirmation more than once, and four
 * separate routes can act on it. updateOrderPaymentStatus already ensures the paid
 * transition happens once; this index means that even if that guard were bypassed,
 * a sale still cannot be counted twice.
 *
 * Ensured once per warm process - createIndex is a no-op after the first call, and a
 * failure here must never block the payment it accompanies.
 */
let indexesEnsured = false
async function ensureIndexes() {
  if (indexesEnsured) return
  try {
    const collection = await getCollection()
    await collection.createIndex({ sourceType: 1, sourceId: 1 }, { unique: true })
    await collection.createIndex({ occurredAt: -1 })
    indexesEnsured = true
  } catch (error) {
    console.error("Failed to ensure income indexes:", error)
  }
}

/**
 * Book income. Safe to call repeatedly for the same sale.
 *
 * Returns false when this sale was already booked, so callers can tell a genuine
 * duplicate from a failure.
 */
export async function recordIncome(input: RecordIncomeInput): Promise<boolean> {
  await ensureIndexes()
  const collection = await getCollection()

  const doc: Omit<IncomeEntry, "_id"> = {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    grossAmount: Math.round(input.grossAmount),
    platformRevenue: Math.round(input.platformRevenue),
    feeRate: input.feeRate ?? null,
    currency: "RWF",
    buyerName: input.buyerName ?? null,
    buyerPhone: input.buyerPhone ?? null,
    sellerId: input.sellerId ?? null,
    reference: input.reference,
    occurredAt: input.occurredAt ?? new Date(),
    createdAt: new Date(),
    reversedAt: null,
  }

  try {
    await collection.insertOne(doc as IncomeEntry)
    return true
  } catch (error: any) {
    // 11000 is the duplicate-key error: this sale is already in the ledger.
    if (error?.code === 11000) return false
    throw error
  }
}

/**
 * Mark income as reversed rather than deleting it.
 *
 * A refunded payment should stop counting towards revenue, but the fact it happened
 * is still part of the record, so the row stays and the totals exclude it.
 */
export async function reverseIncome(sourceType: IncomeSource, sourceId: string): Promise<void> {
  const collection = await getCollection()
  await collection.updateOne(
    { sourceType, sourceId, reversedAt: null },
    { $set: { reversedAt: new Date() } }
  )
}

export interface SourceTotal {
  sourceType: IncomeSource
  grossAmount: number
  platformRevenue: number
  count: number
}

/** Totals per source for a period. Every source appears, at zero if it has no entries. */
export async function getIncomeSummary(from: Date, to: Date): Promise<SourceTotal[]> {
  const collection = await getCollection()
  const rows = await collection
    .aggregate<{ _id: IncomeSource; grossAmount: number; platformRevenue: number; count: number }>([
      { $match: { occurredAt: { $gte: from, $lte: to }, reversedAt: null } },
      {
        $group: {
          _id: "$sourceType",
          grossAmount: { $sum: "$grossAmount" },
          platformRevenue: { $sum: "$platformRevenue" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray()

  const byType = new Map(rows.map((r) => [r._id, r]))

  return INCOME_SOURCES.map((sourceType) => {
    const row = byType.get(sourceType)
    return {
      sourceType,
      grossAmount: row?.grossAmount ?? 0,
      platformRevenue: row?.platformRevenue ?? 0,
      count: row?.count ?? 0,
    }
  })
}

export async function listIncome(
  from: Date,
  to: Date,
  sourceType?: IncomeSource,
  limit = 500
): Promise<IncomeEntry[]> {
  const collection = await getCollection()
  const filter: any = { occurredAt: { $gte: from, $lte: to }, reversedAt: null }
  if (sourceType) filter.sourceType = sourceType
  return collection.find(filter).sort({ occurredAt: -1 }).limit(limit).toArray()
}

export function serializeEntry(entry: IncomeEntry) {
  return {
    id: entry._id.toString(),
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    grossAmount: entry.grossAmount,
    platformRevenue: entry.platformRevenue,
    feeRate: entry.feeRate,
    buyerName: entry.buyerName,
    buyerPhone: entry.buyerPhone,
    reference: entry.reference,
    occurredAt: entry.occurredAt,
  }
}
