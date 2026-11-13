export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import {
  DEVICES,
  READINGS,
  authenticateDevice,
  ensureTrackingIndexes,
  getTrackingDb,
  toNumber,
  type ReadingDoc,
} from "@/lib/tracking/store"

// The collar (or the MQTT bridge in front of it) posts one reading here - the
// replacement for the IoT backend's receive.php, accepting the same JSON so only the
// URL changes on the device side:
// {
//   "device_id": "COW-001", "api_key": "...",
//   "temp_object": 38.5, "temp_ambient": 24.1,
//   "accel_x": 0.02, "accel_y": -0.98, "accel_z": 0.15,     // in g
//   "latitude": -1.9441, "longitude": 30.0619,              // optional
//   "battery_voltage": 3.85, "charging": 1,                  // optional
//   "gps": "fix" | "nofix" | "nocmd"                         // optional
// }
// There is no session: the device_id + api_key pair registered by the farmer is the
// proof. Missing fields are stored as null.

const KNOWN_FIELDS = new Set([
  "device_id", "api_key", "temp_object", "temp_ambient", "accel_x", "accel_y", "accel_z",
  "latitude", "longitude", "battery_voltage", "charging", "gps",
])
const MAX_EXTRA_BYTES = 2048

function inRange(value: number | null, lo: number, hi: number) {
  return value !== null && value >= lo && value <= hi ? value : null
}

export async function POST(request: NextRequest) {
  let data: Record<string, unknown>
  try {
    data = await request.json()
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 })
  }
  if (!data || typeof data !== "object" || Array.isArray(data) || !data.device_id || !data.api_key) {
    return NextResponse.json({ error: "Missing device_id or api_key" }, { status: 400 })
  }

  try {
    const device = await authenticateDevice(data.device_id, data.api_key)
    if (!device) return NextResponse.json({ error: "Invalid device_id or api_key" }, { status: 401 })
    await ensureTrackingIndexes()

    // Anything else the firmware sent, minus the key. Kept small: it is for debugging.
    let extra: Record<string, unknown> | null = null
    const leftovers = Object.fromEntries(Object.entries(data).filter(([k]) => !KNOWN_FIELDS.has(k)))
    if (Object.keys(leftovers).length > 0 && JSON.stringify(leftovers).length <= MAX_EXTRA_BYTES) extra = leftovers

    const charging = toNumber(data.charging)
    const latitude = inRange(toNumber(data.latitude), -90, 90)
    const longitude = inRange(toNumber(data.longitude), -180, 180)
    const hasPosition = latitude !== null && longitude !== null
    const doc: ReadingDoc = {
      deviceRef: device._id,
      farmerId: device.farmerId,
      receivedAt: new Date(),
      tempObject: toNumber(data.temp_object),
      tempAmbient: toNumber(data.temp_ambient),
      accelX: toNumber(data.accel_x),
      accelY: toNumber(data.accel_y),
      accelZ: toNumber(data.accel_z),
      // A position is only useful as a pair (and 0,0 is the "no fix" default of some modules).
      latitude: hasPosition && !(latitude === 0 && longitude === 0) ? latitude : null,
      longitude: hasPosition && !(latitude === 0 && longitude === 0) ? longitude : null,
      batteryVoltage: toNumber(data.battery_voltage),
      charging: charging === null ? null : charging !== 0,
      gps: typeof data.gps === "string" ? data.gps.slice(0, 20) : null,
      extra,
    }

    const db = await getTrackingDb()
    await db.collection<ReadingDoc>(READINGS).insertOne(doc)
    await db.collection(DEVICES).updateOne({ _id: device._id }, { $set: { lastSeenAt: doc.receivedAt } })

    return NextResponse.json({ status: "ok", message: "Reading recorded" }, { status: 201 })
  } catch (error) {
    console.error("IoT reading error:", error)
    return NextResponse.json({ error: "Failed to save reading" }, { status: 500 })
  }
}
