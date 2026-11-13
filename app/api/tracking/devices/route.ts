export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { logActivity } from "@/lib/activity-log"
import {
  API_KEY_MAX_LENGTH,
  API_KEY_MIN_LENGTH,
  DEVICES,
  deviceIdKey,
  ensureTrackingIndexes,
  findFarmAnimal,
  getTrackingDb,
  hashApiKey,
  normalizeDeviceId,
  resolveTrackingAccess,
  serializeDevices,
  type TrackingDeviceDoc,
} from "@/lib/tracking/store"

// GET: a farm's collars. The farmer reads their own (no farmerId needed); a vet
// passes the patient's farmerId and needs a consultation with them.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const farmerId = new URL(req.url).searchParams.get("farmerId") || user._id

    const access = await resolveTrackingAccess(user, farmerId)
    if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status })

    const db = await getTrackingDb()
    const devices = await db
      .collection<TrackingDeviceDoc>(DEVICES)
      .find({ farmerId, status: "active" })
      .sort({ createdAt: 1 })
      .toArray()
    return NextResponse.json({ devices: await serializeDevices(devices), canManage: access.via === "owner" })
  } catch (error) {
    console.error("Tracking devices GET error:", error)
    return NextResponse.json({ error: "Failed to load devices" }, { status: 500 })
  }
}

// POST: the farmer registers a collar with the ID and key its installer gave them -
// the same pair the firmware sends with every reading.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "farmer") return NextResponse.json({ error: "Only farmers can add tracking devices" }, { status: 403 })
    const access = await resolveTrackingAccess(user, user._id)
    if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status })

    const body = await req.json().catch(() => null)
    const deviceId = normalizeDeviceId(body?.deviceId)
    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID must be 1-50 letters, numbers, dots, dashes or underscores", code: "invalid_device_id" },
        { status: 400 }
      )
    }
    const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : ""
    if (apiKey.length < API_KEY_MIN_LENGTH || apiKey.length > API_KEY_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Device key must be ${API_KEY_MIN_LENGTH}-${API_KEY_MAX_LENGTH} characters`, code: "invalid_api_key" },
        { status: 400 }
      )
    }
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : ""
    let animalId: string | null = null
    if (body?.animalId) {
      const animal = await findFarmAnimal(user._id, String(body.animalId))
      if (!animal) return NextResponse.json({ error: "Animal not found on your farm", code: "invalid_animal" }, { status: 400 })
      animalId = animal._id.toString()
    }

    await ensureTrackingIndexes()
    const now = new Date()
    const doc: Omit<TrackingDeviceDoc, "_id"> = {
      deviceId,
      deviceIdKey: deviceIdKey(deviceId),
      apiKeyHash: hashApiKey(apiKey),
      farmerId: user._id,
      name: name || deviceId,
      animalId,
      postures: {},
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastSeenAt: null,
    }

    const db = await getTrackingDb()
    const duplicate = { error: "This device is already registered", code: "duplicate_device" }
    // The unique index is the real guard (it also covers two requests racing); this
    // read keeps the answer right even if the index could not be created.
    if (await db.collection(DEVICES).findOne({ deviceIdKey: doc.deviceIdKey, status: "active" }, { projection: { _id: 1 } })) {
      return NextResponse.json(duplicate, { status: 409 })
    }
    try {
      const { insertedId } = await db.collection(DEVICES).insertOne(doc)
      await logActivity(user._id, "account.tracking_device_added", `Device: ${deviceId}`)
      const [device] = await serializeDevices([{ ...doc, _id: insertedId }])
      return NextResponse.json({ device }, { status: 201 })
    } catch (error: any) {
      if (error?.code === 11000) return NextResponse.json(duplicate, { status: 409 })
      throw error
    }
  } catch (error) {
    console.error("Tracking devices POST error:", error)
    return NextResponse.json({ error: "Failed to add device" }, { status: 500 })
  }
}
