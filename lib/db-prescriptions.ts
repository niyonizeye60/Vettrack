import clientPromise from "@/lib/db"
import { Binary, ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

/**
 * Vet prescriptions that buyers upload at checkout for prescription-only drugs.
 *
 * Kept in the database rather than the public upload store: a prescription names the
 * buyer's animals and their treatment, and listing photos are served from public
 * URLs. These are only ever served through /api/prescriptions/[id], to the pharmacy
 * whose drug was ordered and to finance staff.
 *
 * An upload starts unattached with an `expireAt`, which a TTL index uses to clear
 * uploads abandoned before payment; attaching it to an order removes the expiry.
 */
export interface Prescription {
  _id: ObjectId
  data: Binary
  contentType: string
  size: number
  fileName: string
  orderId: string | null
  createdAt: Date
  expireAt?: Date
}

export const PRESCRIPTION_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
export const PRESCRIPTION_MAX_BYTES = 4 * 1024 * 1024
/** How long an upload waits to be used at checkout. */
const UNATTACHED_HOURS = 6

async function getCollection() {
  const client = await clientPromise
  return client.db(DB_NAME).collection<Prescription>("prescriptions")
}

let indexesEnsured = false
async function ensureIndexes() {
  if (indexesEnsured) return
  try {
    const collection = await getCollection()
    await collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
    indexesEnsured = true
  } catch (error) {
    console.error("Failed to ensure prescription indexes:", error)
  }
}

export async function savePrescription(bytes: Buffer, contentType: string, fileName: string): Promise<string> {
  await ensureIndexes()
  const collection = await getCollection()
  const now = new Date()
  const result = await collection.insertOne({
    data: new Binary(bytes),
    contentType,
    size: bytes.length,
    fileName: fileName.slice(0, 120),
    orderId: null,
    createdAt: now,
    expireAt: new Date(now.getTime() + UNATTACHED_HOURS * 3600_000),
  } as Prescription)
  return result.insertedId.toString()
}

/**
 * Tie an upload to the order it was made for. Returns false if it doesn't exist, has
 * lapsed, or already belongs to another order - one prescription, one order.
 */
export async function attachPrescription(id: string, orderId: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false
  const collection = await getCollection()
  const result = await collection.updateOne(
    { _id: new ObjectId(id), orderId: null },
    { $set: { orderId }, $unset: { expireAt: "" } }
  )
  return result.modifiedCount > 0
}

/** Undo attachPrescription when the order it was attached to could not be saved. */
export async function detachPrescription(id: string, orderId: string): Promise<void> {
  if (!ObjectId.isValid(id)) return
  const collection = await getCollection()
  await collection.updateOne(
    { _id: new ObjectId(id), orderId },
    { $set: { orderId: null, expireAt: new Date(Date.now() + UNATTACHED_HOURS * 3600_000) } }
  )
}

export async function getPrescription(id: string): Promise<Prescription | null> {
  if (!ObjectId.isValid(id)) return null
  const collection = await getCollection()
  return collection.findOne({ _id: new ObjectId(id) })
}
