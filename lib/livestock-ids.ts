import { ObjectId, type Db } from "mongodb"
import { errorMessage } from "@/lib/error-messages"

/**
 * One ear tag ID and one insurance ID, one beast. Within a farm, no two calves or animals
 * share either ID - a calf becomes an animal when it grows up, so the two are one
 * numbering. Other farms can use the same number. Upper and lower case count as the same
 * ID. Every route and action that saves one of these IDs goes through here.
 */
export const LIVESTOCK_ID_COLLATION = { locale: "en", strength: 2 }

const FIELDS = {
  earTagId: { message: "earTagInUse", code: "EAR_TAG_IN_USE" },
  insuranceId: { message: "insuranceIdInUse", code: "INSURANCE_ID_IN_USE" },
} as const

export type LivestockIdField = keyof typeof FIELDS
export type LivestockIds = Record<LivestockIdField, string | null>
export interface LivestockIdConflict {
  error: string
  code: string
  field: LivestockIdField
}
/** The record being saved: it, and the calf or animal it was or became, don't count against it. */
export interface SavedLivestock {
  calfId?: string
  animalId?: string
}

const FIELD_NAMES = Object.keys(FIELDS) as LivestockIdField[]

export function cleanLivestockId(value: unknown): string | null {
  const id = typeof value === "string" ? value.trim() : ""
  return id || null
}

/** Only the IDs a save changes, so records that already shared one can still be edited. */
export function changedLivestockIds(next: LivestockIds, current: Record<string, unknown>): LivestockIds {
  const changed = (field: LivestockIdField) => {
    const id = next[field]
    return id && id.toLowerCase() !== (cleanLivestockId(current[field]) || "").toLowerCase() ? id : null
  }
  return { earTagId: changed("earTagId"), insuranceId: changed("insuranceId") }
}

// Stops two saves at the same moment both passing the check below. Tried once per warm
// process: an index can't be built while records from before this rule still share an
// ID, and until it is, that check alone guards each save. No sale or other code moves an
// animal between owners, so these can't get in the way of anything but a duplicate.
let indexes: Promise<unknown> | null = null
function ensureIndexes(db: Db) {
  indexes ??= Promise.all(
    FIELD_NAMES.flatMap((field) => [
      db
        .collection("calves")
        .createIndex(
          { farmerId: 1, [field]: 1 },
          { unique: true, collation: LIVESTOCK_ID_COLLATION, partialFilterExpression: { [field]: { $type: "string" } } }
        )
        .catch((error) => console.error(`Failed to ensure unique index on calves.${field}:`, error)),
      // Only rows with a plain ownerId: older rows may name their owner another way.
      db
        .collection("animals")
        .createIndex(
          { ownerId: 1, [field]: 1 },
          {
            unique: true,
            collation: LIVESTOCK_ID_COLLATION,
            partialFilterExpression: { [field]: { $type: "string" }, ownerId: { $type: "string" } },
          }
        )
        .catch((error) => console.error(`Failed to ensure unique index on animals.${field}:`, error)),
    ])
  )
  return indexes
}

function refused(field: LivestockIdField, id: string, holderName?: string | null): LivestockIdConflict {
  const { message, code } = FIELDS[field]
  return { error: errorMessage(message, { id, name: holderName || "another animal" }), code, field }
}

/** The first of `ids` that a calf or animal on this farm already has, or null if they're free. */
export async function findLivestockIdConflict(
  db: Db,
  farmerId: string,
  ids: LivestockIds,
  saved: SavedLivestock = {}
): Promise<LivestockIdConflict | null> {
  if (!ids.earTagId && !ids.insuranceId) return null
  await ensureIndexes(db)

  for (const field of FIELD_NAMES) {
    const id = ids[field]
    if (!id) continue

    const calf = await db.collection("calves").findOne(
      { farmerId, [field]: id, ...(saved.calfId ? { _id: { $ne: new ObjectId(saved.calfId) } } : {}) },
      { collation: LIVESTOCK_ID_COLLATION, projection: { name: 1 } }
    )
    if (calf) return refused(field, id, calf.name)

    // Same legacy owner shapes as getAnimals() in lib/actions.ts.
    const animal = await db.collection("animals").findOne(
      {
        [field]: id,
        $or: [{ ownerId: farmerId }, { "owner._id": farmerId }, { owner: farmerId }],
        ...(saved.animalId ? { _id: { $ne: new ObjectId(saved.animalId) } } : {}),
        ...(saved.calfId ? { graduatedFromCalfId: { $ne: saved.calfId } } : {}),
      },
      { collation: LIVESTOCK_ID_COLLATION, projection: { name: 1 } }
    )
    if (animal) return refused(field, id, animal.name)
  }
  return null
}

/** For a failed save: the refusal to send if a unique index turned it down, otherwise null. */
export async function livestockIdConflictFromError(
  error: unknown,
  db: Db,
  farmerId: string,
  ids: LivestockIds,
  saved: SavedLivestock = {}
): Promise<LivestockIdConflict | null> {
  const { code, keyPattern } = error as { code?: number; keyPattern?: Record<string, unknown> }
  if (code !== 11000) return null
  // Another save took the ID since the check. Its row is there now, so name it.
  const found = await findLivestockIdConflict(db, farmerId, ids, saved)
  if (found) return found
  const field = FIELD_NAMES.find((name) => keyPattern?.[name]) ?? "earTagId"
  return refused(field, ids[field] || "")
}
