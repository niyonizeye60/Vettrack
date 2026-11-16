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
  includesRealAccount,
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
    const devices = db.collection<TrackingDeviceDoc>(DEVICES)
    const duplicate = () =>
      NextResponse.json({ error: "This device is already registered", code: "duplicate_device" }, { status: 409 })
    const duplicateOwn = () =>
      NextResponse.json({ error: "You have already added this device", code: "duplicate_own_device" }, { status: 409 })

    // One real farm per collar. Accounts marked for testing neither block nor are
    // blocked (see lib/tracking/store.ts), so a collar can be tried out on a test
    // account before, or while, a farm has it.
    const isTestAccount = user.isTestAccount === true
    const holders = await devices
      .find({ deviceIdKey: doc.deviceIdKey, status: "active" }, { projection: { farmerId: 1 } })
      .toArray()
    if (holders.some((d) => d.farmerId === user._id)) return duplicateOwn()
    if (!isTestAccount && (await includesRealAccount(holders.map((d) => d.farmerId)))) return duplicate()

    const inserted = await db.collection(DEVICES).insertOne(doc).catch((error) => {
      if (error?.code !== 11000) throw error
      // The per-account index: the same account adding the collar twice at once. Any
      // other unique index here is the old one-account-per-collar index, still in
      // place because ensureTrackingIndexes could not drop it.
      return error.keyPattern?.farmerId ? "own" : "other"
    })
    if (inserted === "own") return duplicateOwn()
    if (inserted === "other") return duplicate()
    const { insertedId } = inserted
    if (!isTestAccount) {
      // Two real farms adding the same collar at the same moment both pass the check
      // above. The earlier registration keeps the collar and the later one is undone.
      const earlier = await devices
        .find(
          { deviceIdKey: doc.deviceIdKey, status: "active", _id: { $lt: insertedId }, farmerId: { $ne: user._id } },
          { projection: { farmerId: 1 } }
        )
        .toArray()
      if (await includesRealAccount(earlier.map((d) => d.farmerId))) {
        await devices.deleteOne({ _id: insertedId })
        return duplicate()
      }
    }

    await logActivity(user._id, "account.tracking_device_added", `Device: ${deviceId}`)
    const [device] = await serializeDevices([{ ...doc, _id: insertedId }])
    return NextResponse.json({ device }, { status: 201 })
  } catch (error) {
    console.error("Tracking devices POST error:", error)
    return NextResponse.json({ error: "Failed to add device" }, { status: 500 })
  }
}
