// Server-side storage for the cattle collars: device registrations, the readings and
// accelerometer bursts the collars send, and who may read them.
//
// Replaces the IoT backend's MySQL tables (devices, readings, heart_rate_estimates).
// Every reading and burst is tied to the *registration* (deviceRef), not just the
// collar's ID: if a collar is removed and later registered by another farmer, the new
// owner starts with an empty history instead of inheriting the previous farm's data.
import { createHash, timingSafeEqual } from "crypto"
import { ObjectId, type Db } from "mongodb"
import clientPromise, { withDbRetry } from "@/lib/db"
import { POSTURE_NAMES, type PostureCalibration, type Vec3 } from "./behaviour"
import type { HrNote } from "./heart-rate"
import type { TrackingDeviceSummary } from "./types"

const DB = "ntdm_animal_hospital"
export const DEVICES = "tracking_devices"
export const READINGS = "tracking_readings"
export const BURSTS = "tracking_bursts"

export interface TrackingDeviceDoc {
  _id: ObjectId
  /** As the firmware sends it. */
  deviceId: string
  /** Upper-cased deviceId. MySQL compared device IDs case-insensitively; so do we. */
  deviceIdKey: string
  /** SHA-256 of the collar's api_key. The key itself is never stored. */
  apiKeyHash: string
  farmerId: string
  name: string
  animalId: string | null
  postures: PostureCalibration
  status: "active" | "removed"
  createdAt: Date
  updatedAt: Date
  lastSeenAt: Date | null
  removedAt?: Date
}

export interface ReadingDoc {
  _id?: ObjectId
  deviceRef: ObjectId
  farmerId: string
  receivedAt: Date
  tempObject: number | null
  tempAmbient: number | null
  accelX: number | null
  accelY: number | null
  accelZ: number | null
  latitude: number | null
  longitude: number | null
  batteryVoltage: number | null
  charging: boolean | null
  gps: string | null
  /** Any other fields the firmware sent (api_key removed), kept for debugging. */
  extra: Record<string, unknown> | null
}

export interface BurstDoc {
  _id?: ObjectId
  deviceRef: ObjectId
  farmerId: string
  receivedAt: Date
  sampleRateHz: number
  /** Counts per g as the collar sent it; 0 = not sent (the behaviour code then assumes 10000). */
  scalePerG: number
  durationSeconds: number
  /** Raw acceleration magnitude in counts, kept so real cow data can be studied later. */
  samples: number[]
  sampleCount: number
  motionMg: number | null
  bpm: number | null
  bpmPeaks: number | null
  confidence: number | null
  method: string | null
  /** The heart-rate analysis's English note, as hr_process.php words it. */
  notes: string | null
  /** The same note as a code, for the page to translate. Missing on bursts analysed before it existed. */
  noteCode?: HrNote | null
  /** False on bursts stored before the heart-rate analysis was ported; the page analyses those when it shows them. */
  analysed: boolean
}

export async function getTrackingDb(): Promise<Db> {
  const client = await clientPromise
  return client.db(DB)
}

/**
 * Ensured once per warm process - createIndex is a no-op after the first call. The
 * unique index is what actually stops one collar being registered to two farms at
 * once; it is partial so a removed registration doesn't block re-registering.
 */
let indexesEnsured: Promise<void> | null = null
export function ensureTrackingIndexes(): Promise<void> {
  if (!indexesEnsured) {
    indexesEnsured = (async () => {
      const db = await getTrackingDb()
      await db.collection(DEVICES).createIndex(
        { deviceIdKey: 1 },
        { unique: true, partialFilterExpression: { status: "active" }, name: "active_device_unique" }
      )
      await db.collection(DEVICES).createIndex({ farmerId: 1, status: 1 })
      await db.collection(READINGS).createIndex({ deviceRef: 1, receivedAt: -1 })
      await db.collection(BURSTS).createIndex({ deviceRef: 1, receivedAt: -1 })
    })().catch((error) => {
      indexesEnsured = null // try again on the next request
      console.error("Failed to ensure tracking indexes:", error)
    })
  }
  return indexesEnsured
}

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

const DEVICE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,50}$/

/** The collar ID as typed or sent, trimmed - or null when it isn't a plausible ID. */
export function normalizeDeviceId(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const id = raw.trim()
  return DEVICE_ID_PATTERN.test(id) ? id : null
}

export const deviceIdKey = (deviceId: string) => deviceId.toUpperCase()

export const API_KEY_MIN_LENGTH = 16
export const API_KEY_MAX_LENGTH = 128

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex")
}

function keyMatches(apiKey: string, hash: string): boolean {
  const a = Buffer.from(hashApiKey(apiKey), "hex")
  const b = Buffer.from(hash, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * The active registration for a collar whose api_key matches, or null. Used by the
 * endpoints the collars post to - there is no session there, the key is the proof.
 */
export async function authenticateDevice(rawDeviceId: unknown, rawApiKey: unknown): Promise<TrackingDeviceDoc | null> {
  const deviceId = normalizeDeviceId(rawDeviceId)
  if (!deviceId || typeof rawApiKey !== "string" || !rawApiKey || rawApiKey.length > API_KEY_MAX_LENGTH) return null
  const db = await getTrackingDb()
  const device = await withDbRetry(() =>
    db.collection<TrackingDeviceDoc>(DEVICES).findOne({ deviceIdKey: deviceIdKey(deviceId), status: "active" })
  )
  if (!device || !keyMatches(rawApiKey, device.apiKeyHash)) return null
  return device
}

/** Finite number from a JSON number or numeric string, else null. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === "number" && Number.isFinite(v))
}

/** Only well-formed calibration poses survive, so a bad document can't break the maths. */
export function cleanPostures(raw: unknown): PostureCalibration {
  const out: PostureCalibration = {}
  if (!raw || typeof raw !== "object") return out
  for (const name of POSTURE_NAMES) {
    const v = (raw as Record<string, unknown>)[name]
    if (isVec3(v)) out[name] = v
  }
  return out
}

// ---------------------------------------------------------------------------
// Who may read a farm's tracking data
// ---------------------------------------------------------------------------

interface ActorLike {
  _id: string
  role: string
  status?: string
}

export type TrackingAccess =
  | { allowed: true; via: "owner" | "staff" | "vet" }
  | { allowed: false; status: 401 | 403; reason: string }

/**
 * Owner -> staff -> vet with a consultation -> deny. The vet rule is the one the
 * ThingSpeak-era vet tracking page used: any consultation between the two. Only the
 * owner may register, change or remove devices; everyone else here reads.
 */
export async function resolveTrackingAccess(user: ActorLike | null, farmerId: string): Promise<TrackingAccess> {
  if (!user) return { allowed: false, status: 401, reason: "Unauthorized" }
  if (user.status === "suspended" || user.status === "inactive") {
    return { allowed: false, status: 403, reason: "Your account is no longer active. Contact an administrator for assistance." }
  }
  if (!farmerId) return { allowed: false, status: 403, reason: "Forbidden" }
  if (user._id === farmerId) return { allowed: true, via: "owner" }
  if (user.role === "admin" || user.role === "superadmin") return { allowed: true, via: "staff" }
  if (user.role !== "doctor" || !ObjectId.isValid(farmerId)) return { allowed: false, status: 403, reason: "Forbidden" }

  const db = await getTrackingDb()
  const owner = await withDbRetry(() =>
    db.collection("users").findOne({ _id: new ObjectId(farmerId) }, { projection: { status: 1 } })
  )
  if (!owner) return { allowed: false, status: 403, reason: "Forbidden" }
  if (owner.status === "suspended" || owner.status === "inactive") {
    return { allowed: false, status: 403, reason: "This farmer's account is no longer active" }
  }

  const link = await withDbRetry(() =>
    db.collection("consultations").findOne(
      {
        farmerId,
        $or: [{ doctor: user._id }, ...(ObjectId.isValid(user._id) ? [{ doctor: new ObjectId(user._id) }] : [])],
      },
      { projection: { _id: 1 } }
    )
  )
  if (!link) return { allowed: false, status: 403, reason: "You have no consultation with this patient" }
  return { allowed: true, via: "vet" }
}

// ---------------------------------------------------------------------------
// Registrations as the pages see them
// ---------------------------------------------------------------------------

export async function findActiveDevice(id: string): Promise<TrackingDeviceDoc | null> {
  if (!ObjectId.isValid(id)) return null
  const db = await getTrackingDb()
  return withDbRetry(() =>
    db.collection<TrackingDeviceDoc>(DEVICES).findOne({ _id: new ObjectId(id), status: "active" })
  )
}

/** The farmer's animal with this id, or null - same legacy ownerId shapes as getAnimals(). */
export async function findFarmAnimal(farmerId: string, animalId: string) {
  if (!ObjectId.isValid(animalId)) return null
  const db = await getTrackingDb()
  return db.collection("animals").findOne(
    { _id: new ObjectId(animalId), $or: [{ ownerId: farmerId }, { "owner._id": farmerId }, { owner: farmerId }] },
    { projection: { name: 1, earTagId: 1 } }
  )
}

export async function serializeDevices(devices: TrackingDeviceDoc[]): Promise<TrackingDeviceSummary[]> {
  const animalIds = devices.map((d) => d.animalId).filter((id): id is string => !!id && ObjectId.isValid(id))
  const names = new Map<string, string>()
  if (animalIds.length > 0) {
    const db = await getTrackingDb()
    const animals = await db
      .collection("animals")
      .find({ _id: { $in: animalIds.map((id) => new ObjectId(id)) } })
      .project({ name: 1, earTagId: 1 })
      .toArray()
    for (const a of animals) {
      names.set(a._id.toString(), [a.name, a.earTagId ? `#${a.earTagId}` : null].filter(Boolean).join(" "))
    }
  }
  return devices.map((d) => {
    const postures = cleanPostures(d.postures)
    return {
      id: d._id.toString(),
      deviceId: d.deviceId,
      name: d.name,
      animalId: d.animalId,
      animalName: d.animalId ? names.get(d.animalId) ?? null : null,
      lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
      calibrated: { standing: !!postures.standing, head_down: !!postures.head_down, lying: !!postures.lying },
    }
  })
}
