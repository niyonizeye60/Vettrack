import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { DEFAULT_COMMISSION_RULE, type CommissionMode, type ResolvedRule } from "@/lib/commission"

const DB_NAME = "ntdm_animal_hospital"

export type { CommissionMode, ResolvedRule } from "@/lib/commission"

/**
 * What Vettrack charges a buyer to be connected to a seller.
 *
 * Append-only: changing the fee writes a new row rather than editing the old one,
 * so last year's reports don't move when this year's rate changes. The rate that
 * applied at the moment of sale is also copied onto the order itself, which is what
 * the finance dashboard reads - this collection is only ever consulted to price a
 * *new* connection.
 */
export interface CommissionRule {
  _id: ObjectId
  category: "sales"
  mode: CommissionMode
  value: number
  minFee: number | null
  maxFee: number | null
  effectiveFrom: Date
  createdBy: ObjectId | null
  createdAt: Date
}

async function getCollection() {
  const client = await clientPromise
  return client.db(DB_NAME).collection<CommissionRule>("commission_rules")
}

/** The rule in force right now, or the built-in default if none has been set. */
export async function getActiveRule(category: "sales" = "sales"): Promise<ResolvedRule> {
  const collection = await getCollection()
  const rule = await collection
    .find({ category, effectiveFrom: { $lte: new Date() } })
    .sort({ effectiveFrom: -1, createdAt: -1 })
    .limit(1)
    .next()

  if (!rule) return DEFAULT_COMMISSION_RULE

  return {
    mode: rule.mode,
    value: rule.value,
    minFee: rule.minFee,
    maxFee: rule.maxFee,
    configured: true,
  }
}

export async function listRules(category: "sales" = "sales"): Promise<CommissionRule[]> {
  const collection = await getCollection()
  return collection.find({ category }).sort({ effectiveFrom: -1 }).limit(50).toArray()
}

export async function createRule(
  input: {
    mode: CommissionMode
    value: number
    minFee?: number | null
    maxFee?: number | null
    effectiveFrom?: Date
  },
  createdBy: string
): Promise<CommissionRule> {
  const collection = await getCollection()
  const doc: Omit<CommissionRule, "_id"> = {
    category: "sales",
    mode: input.mode,
    value: input.value,
    minFee: input.minFee ?? null,
    maxFee: input.maxFee ?? null,
    effectiveFrom: input.effectiveFrom ?? new Date(),
    createdBy: ObjectId.isValid(createdBy) ? new ObjectId(createdBy) : null,
    createdAt: new Date(),
  }
  const result = await collection.insertOne(doc as CommissionRule)
  return { ...doc, _id: result.insertedId } as CommissionRule
}

export function serializeRule(rule: CommissionRule) {
  return {
    id: rule._id.toString(),
    mode: rule.mode,
    value: rule.value,
    minFee: rule.minFee,
    maxFee: rule.maxFee,
    effectiveFrom: rule.effectiveFrom,
    createdAt: rule.createdAt,
  }
}
