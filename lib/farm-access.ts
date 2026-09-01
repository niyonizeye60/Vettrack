import clientPromise, { withDbRetry } from "./db"
import { ObjectId } from "mongodb"
import {
  emptyPermissions,
  normalizePermissions,
  type PermissionAction,
  type PermissionMap,
  type PermissionModule,
} from "./permissions"

const DB = "ntdm_animal_hospital"
const GRANTS = "farm_vet_grants"
const AUDIT = "vet_audit_logs"

const STAFF_ROLES = ["admin", "superadmin"]

// A "farm" is the farmer's own user account - there is no farms collection. Ownership
// of every record collection runs through the string farmerId, so grants key on the
// same string form rather than ObjectId to stay joinable with existing documents.
export interface FarmVetGrant {
  _id?: string
  farmerId: string
  vetId: string
  permissions: PermissionMap
  updateOwnOnly: boolean
  status: "active" | "revoked"
  note: string | null
  grantedAt: Date
  updatedAt: Date
  revokedAt: Date | null
}

interface ActorLike {
  _id: string
  role: string
  name?: string
}

export type FarmAccess =
  | { allowed: true; via: "owner" | "staff" | "grant"; grant?: FarmVetGrant }
  | { allowed: false; status: 401 | 403; reason: string }

function hydrateGrant(doc: any): FarmVetGrant {
  return {
    _id: doc._id?.toString(),
    farmerId: doc.farmerId,
    vetId: doc.vetId,
    // Normalizing on read means a grant written before a new module was added to the
    // registry yields `false` for that module instead of `undefined`, so a missing
    // key can never be mistaken for permission.
    permissions: normalizePermissions(doc.permissions),
    updateOwnOnly: doc.updateOwnOnly === true,
    status: doc.status === "revoked" ? "revoked" : "active",
    note: doc.note ?? null,
    grantedAt: doc.grantedAt,
    updatedAt: doc.updatedAt,
    revokedAt: doc.revokedAt ?? null,
  }
}

/**
 * The vet's live grant on a farm, or null. Read fresh on every request - there is no
 * cache and nothing is copied into the session, which is what makes revocation take
 * effect on the very next call.
 */
export async function getActiveGrant(vetId: string, farmerId: string): Promise<FarmVetGrant | null> {
  const client = await clientPromise
  const db = client.db(DB)
  // Retried: this sits on the hot path of every insemination/disease request, and a
  // transient blip must not be indistinguishable from "no grant" (i.e. a 403).
  const doc = await withDbRetry(() =>
    db.collection(GRANTS).findOne({ vetId, farmerId, status: "active" })
  )
  return doc ? hydrateGrant(doc) : null
}

/**
 * Central authorization for farm-scoped records.
 *
 * Order: owner -> staff -> delegated grant -> deny. The veterinarian branch is a
 * delegation, never an impersonation: the vet acts as themselves with exactly the
 * actions the farmer ticked, and nothing about this widens their reach to any other
 * farm or any module the farmer left off.
 *
 * Pass the already-fetched document as `opts.record` on update/delete so the
 * updateOwnOnly restriction can be checked without a second read.
 */
export async function resolveFarmAccess(
  user: ActorLike | null,
  farmerId: string,
  moduleKey: PermissionModule,
  action: PermissionAction,
  opts: { record?: { createdById?: string | null } | null } = {}
): Promise<FarmAccess> {
  if (!user) return { allowed: false, status: 401, reason: "Unauthorized" }
  if (!farmerId) return { allowed: false, status: 403, reason: "Forbidden" }

  if (user._id === farmerId) return { allowed: true, via: "owner" }
  if (STAFF_ROLES.includes(user.role)) return { allowed: true, via: "staff" }

  if (user.role !== "doctor") {
    return { allowed: false, status: 403, reason: "Forbidden" }
  }

  const grant = await getActiveGrant(user._id, farmerId)
  if (!grant) {
    return { allowed: false, status: 403, reason: "You do not have access to this farm" }
  }

  if (!grant.permissions[moduleKey]?.[action]) {
    return { allowed: false, status: 403, reason: `You are not permitted to ${action} these records` }
  }

  // "May only change what they authored." Fails closed on legacy rows that predate
  // provenance tracking: no createdById means it is not the vet's own record.
  if (grant.updateOwnOnly && (action === "update" || action === "delete")) {
    const owner = opts.record?.createdById
    if (!owner || owner !== user._id) {
      return { allowed: false, status: 403, reason: "You may only modify records you created" }
    }
  }

  return { allowed: true, via: "grant", grant }
}

export async function listGrantsForFarmer(farmerId: string) {
  const client = await clientPromise
  const db = client.db(DB)
  const grants = await db.collection(GRANTS).find({ farmerId }).sort({ grantedAt: -1 }).toArray()
  if (grants.length === 0) return []

  const vetIds = grants.map((g) => g.vetId).filter((id) => ObjectId.isValid(id))
  const vets = await db
    .collection("users")
    .find({ _id: { $in: vetIds.map((id) => new ObjectId(id)) } })
    .project({ name: 1, email: 1, phone: 1, specialization: 1, image: 1 })
    .toArray()
  const vetById = new Map(vets.map((v) => [v._id.toString(), v]))

  return grants.map((g) => {
    const vet = vetById.get(g.vetId)
    return {
      ...hydrateGrant(g),
      vet: {
        _id: g.vetId,
        name: vet?.name || "Unknown veterinarian",
        email: vet?.email || "",
        phone: vet?.phone || "",
        specialization: vet?.specialization || "",
        image: vet?.image || null,
      },
    }
  })
}

/**
 * Farms this vet currently holds an active grant on. Farmer fields are projected
 * down to what identifies the farm - name and location - and deliberately exclude
 * email, contact and every account detail.
 */
export async function listFarmsForVet(vetId: string) {
  const client = await clientPromise
  const db = client.db(DB)
  const grants = await db
    .collection(GRANTS)
    .find({ vetId, status: "active" })
    .sort({ grantedAt: -1 })
    .toArray()
  if (grants.length === 0) return []

  const farmerIds = grants.map((g) => g.farmerId).filter((id) => ObjectId.isValid(id))
  const farmers = await db
    .collection("users")
    .find({ _id: { $in: farmerIds.map((id) => new ObjectId(id)) } })
    .project({ name: 1, district: 1, sector: 1 })
    .toArray()
  const farmerById = new Map(farmers.map((f) => [f._id.toString(), f]))

  return grants
    .filter((g) => farmerById.has(g.farmerId))
    .map((g) => {
      const farmer = farmerById.get(g.farmerId)!
      const grant = hydrateGrant(g)
      return {
        farmerId: g.farmerId,
        farmerName: farmer.name || "Unknown farmer",
        district: farmer.district || "",
        sector: farmer.sector || "",
        permissions: grant.permissions,
        updateOwnOnly: grant.updateOwnOnly,
        grantedAt: grant.grantedAt,
      }
    })
}

/**
 * Confirm an animal actually belongs to the farm a record is being filed against.
 *
 * The record routes accept animalId from the request body and write through to the
 * animals collection (disease creation flips status to "Sick"). Without this check a
 * caller authorized on farm A could name an animal from farm B and mutate it, so
 * every animalId must be re-tied to the farm the grant was resolved against.
 *
 * Same legacy ownerId shapes as getAnimals() in lib/actions.ts.
 */
export async function animalBelongsToFarm(animalId: string, farmerId: string): Promise<boolean> {
  if (!animalId || !ObjectId.isValid(animalId)) return false
  const client = await clientPromise
  const db = client.db(DB)
  const animal = await db.collection("animals").findOne(
    {
      _id: new ObjectId(animalId),
      $or: [{ ownerId: farmerId }, { "owner._id": farmerId }, { owner: farmerId }],
    },
    { projection: { _id: 1 } }
  )
  return !!animal
}

/**
 * What a farm record can be filed against. Calves live in their own collection with
 * their own id space, so an id alone cannot say which one it came from - every record
 * that accepts both must store the type alongside it and re-check the pair here.
 */
export type RecordSubjectType = "animal" | "calf"

export function isRecordSubjectType(value: unknown): value is RecordSubjectType {
  return value === "animal" || value === "calf"
}

/**
 * Confirm a calf actually belongs to the farm a record is being filed against.
 *
 * Same role as animalBelongsToFarm(): the record routes take an id from the request
 * body, so without this a caller authorized on farm A could name farm B's calf.
 * Calves are always stored with a flat farmerId - there are no legacy owner shapes.
 */
export async function calfBelongsToFarm(calfId: string, farmerId: string): Promise<boolean> {
  if (!calfId || !ObjectId.isValid(calfId)) return false
  const client = await clientPromise
  const db = client.db(DB)
  const calf = await db.collection("calves").findOne(
    { _id: new ObjectId(calfId), farmerId },
    { projection: { _id: 1 } }
  )
  return !!calf
}

/**
 * Ownership check for a record that may target either an animal or a calf.
 *
 * Dispatches on the caller-supplied type, so a calf id can never be validated against
 * the animals collection or vice versa. Fails closed on an unrecognised type.
 */
export async function subjectBelongsToFarm(
  subjectType: unknown,
  subjectId: string,
  farmerId: string
): Promise<boolean> {
  if (!isRecordSubjectType(subjectType)) return false
  return subjectType === "calf"
    ? calfBelongsToFarm(subjectId, farmerId)
    : animalBelongsToFarm(subjectId, farmerId)
}

export interface VetActionEntry {
  farmerId: string
  vetId: string
  vetName: string
  module: PermissionModule | "access"
  action: string
  recordId?: string | null
  animalId?: string | null
  animalName?: string | null
  summary: string
  changes?: { field: string; from: unknown; to: unknown }[] | null
}

/**
 * Append to the farmer-facing audit trail.
 *
 * Separate from user_activity_logs (lib/activity-log.ts): that collection is keyed on
 * userId alone, is surfaced only to superadmins, and stores no record id - it cannot
 * answer "what happened on MY farm". Callers still fire logActivity() alongside this
 * so the superadmin timeline is unchanged.
 *
 * Never throws: an audit write failing must not roll back or 500 the clinical action
 * that succeeded.
 */
export async function logVetAction(entry: VetActionEntry) {
  try {
    const client = await clientPromise
    const db = client.db(DB)
    await db.collection(AUDIT).insertOne({
      ...entry,
      recordId: entry.recordId ?? null,
      animalId: entry.animalId ?? null,
      animalName: entry.animalName ?? null,
      changes: entry.changes ?? null,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error("Error writing vet audit log:", error)
  }
}

/** Field-level diff for audit entries, skipping unchanged and internal fields. */
export function diffRecord(
  before: Record<string, any>,
  after: Record<string, any>,
  ignore: string[] = []
) {
  const skip = new Set([
    "_id",
    "farmerId",
    "createdAt",
    "updatedAt",
    "createdById",
    "createdByRole",
    "createdByName",
    "updatedById",
    "updatedByRole",
    "updatedByName",
    ...ignore,
  ])
  const changes: { field: string; from: unknown; to: unknown }[] = []
  for (const key of Object.keys(after)) {
    if (skip.has(key)) continue
    const from = before?.[key]
    const to = after[key]
    if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) {
      changes.push({ field: key, from: from ?? null, to: to ?? null })
    }
  }
  return changes
}

/** Provenance stamp written onto every record create/update. */
export function provenanceFor(user: ActorLike, mode: "create" | "update") {
  return mode === "create"
    ? {
        createdById: user._id,
        createdByRole: user.role,
        createdByName: user.name || "",
      }
    : {
        updatedById: user._id,
        updatedByRole: user.role,
        updatedByName: user.name || "",
        updatedAt: new Date(),
      }
}

export { emptyPermissions, normalizePermissions }
