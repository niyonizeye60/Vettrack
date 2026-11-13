export const dynamicParams = true;
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import { POSTURE_NAMES, type PostureName, type Vec3 } from "@/lib/tracking/behaviour"
import {
  API_KEY_MAX_LENGTH,
  API_KEY_MIN_LENGTH,
  DEVICES,
  READINGS,
  findActiveDevice,
  findFarmAnimal,
  getTrackingDb,
  hashApiKey,
  resolveTrackingAccess,
  serializeDevices,
  type ReadingDoc,
  type TrackingDeviceDoc,
} from "@/lib/tracking/store"

// A reading older than this is not "how the collar sits right now".
const CALIBRATION_MAX_AGE_MS = 30 * 60 * 1000

/** The device, if the current user owns it. Changing or removing a collar is the farmer's alone. */
async function ownedDevice(id: string) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const device = await findActiveDevice(id)
  if (!device) return { error: NextResponse.json({ error: "Device not found" }, { status: 404 }) }
  const access = await resolveTrackingAccess(user, device.farmerId)
  if (!access.allowed || access.via !== "owner") {
    return { error: NextResponse.json({ error: "Only the farm owner can change this device" }, { status: 403 }) }
  }
  return { user, device }
}

// PATCH: rename, link an animal, replace the key, or record a posture calibration.
// Calibration takes the newest accelerometer reading as "this is what <posture>
// looks like for this collar on this animal" - what behaviour_config.php asked the
// installer to copy off the dashboard by hand.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const found = await ownedDevice(params.id)
    if ("error" in found) return found.error
    const { user, device } = found

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 })

    const set: Record<string, unknown> = {}
    const unset: Record<string, ""> = {}
    const changes: string[] = []

    if (typeof body.name === "string") {
      set.name = body.name.trim().slice(0, 100) || device.deviceId
      changes.push("name")
    }
    if ("animalId" in body) {
      if (body.animalId) {
        const animal = await findFarmAnimal(user._id, String(body.animalId))
        if (!animal) return NextResponse.json({ error: "Animal not found on your farm", code: "invalid_animal" }, { status: 400 })
        set.animalId = animal._id.toString()
      } else {
        set.animalId = null
      }
      changes.push("animal")
    }
    if (typeof body.apiKey === "string") {
      const apiKey = body.apiKey.trim()
      if (apiKey.length < API_KEY_MIN_LENGTH || apiKey.length > API_KEY_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Device key must be ${API_KEY_MIN_LENGTH}-${API_KEY_MAX_LENGTH} characters`, code: "invalid_api_key" },
          { status: 400 }
        )
      }
      set.apiKeyHash = hashApiKey(apiKey)
      changes.push("key")
    }

    let calibratedWith: { posture: PostureName; g: Vec3; time: string } | null = null
    if (body.calibrate) {
      const posture = body.calibrate.posture as PostureName
      if (!POSTURE_NAMES.includes(posture)) return NextResponse.json({ error: "Unknown posture" }, { status: 400 })
      if (body.calibrate.action === "clear") {
        unset[`postures.${posture}`] = ""
      } else {
        const db = await getTrackingDb()
        const latest = await db.collection<ReadingDoc>(READINGS).findOne(
          { deviceRef: device._id, accelX: { $ne: null }, accelY: { $ne: null }, accelZ: { $ne: null } },
          { sort: { receivedAt: -1 } }
        )
        if (!latest || Date.now() - latest.receivedAt.getTime() > CALIBRATION_MAX_AGE_MS) {
          return NextResponse.json(
            { error: "No accelerometer reading from this collar in the last 30 minutes", code: "no_recent_reading" },
            { status: 409 }
          )
        }
        const g: Vec3 = [latest.accelX as number, latest.accelY as number, latest.accelZ as number]
        set[`postures.${posture}`] = g
        calibratedWith = { posture, g, time: latest.receivedAt.toISOString() }
      }
      changes.push(`calibration ${posture}`)
    }

    if (changes.length === 0) return NextResponse.json({ error: "Nothing to change" }, { status: 400 })

    const db = await getTrackingDb()
    const updated = await db.collection<TrackingDeviceDoc>(DEVICES).findOneAndUpdate(
      { _id: device._id, status: "active" },
      { $set: { ...set, updatedAt: new Date() }, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: "after" }
    )
    if (!updated) return NextResponse.json({ error: "Device not found" }, { status: 404 })

    await logActivity(user._id, "account.tracking_device_updated", `Device: ${device.deviceId} (${changes.join(", ")})`)
    const [summary] = await serializeDevices([updated])
    return NextResponse.json({ device: summary, calibratedWith })
  } catch (error) {
    console.error("Tracking device PATCH error:", error)
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 })
  }
}

// DELETE: stop tracking this collar. The registration is marked removed rather than
// deleted, so its history is kept (and the collar can be registered again, starting
// a fresh history); nothing reads a removed registration's data.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const found = await ownedDevice(params.id)
    if ("error" in found) return found.error
    const { user, device } = found

    const db = await getTrackingDb()
    const now = new Date()
    await db.collection(DEVICES).updateOne(
      { _id: device._id, status: "active" },
      { $set: { status: "removed", removedAt: now, updatedAt: now } }
    )
    await logActivity(user._id, "account.tracking_device_removed", `Device: ${device.deviceId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Tracking device DELETE error:", error)
    return NextResponse.json({ error: "Failed to remove device" }, { status: 500 })
  }
}
