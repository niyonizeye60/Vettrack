export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { DEFAULT_SCALE_PER_G, motionMg } from "@/lib/tracking/behaviour"
import {
  BURSTS,
  DEVICES,
  authenticateDevice,
  ensureTrackingIndexes,
  getTrackingDb,
  toNumber,
  type BurstDoc,
} from "@/lib/tracking/store"

// A short accelerometer burst (acceleration magnitude, ~8-10 s) - the replacement
// for the IoT backend's receive_burst.php, same JSON. Normally reached through the
// MQTT bridge (topic cattletag/<device>/burst), which adds the api_key:
// {
//   "device_id": "COW-001", "api_key": "...",
//   "sample_rate_hz": 20,
//   "scale_per_g": 10000,            // counts per 1 g (here 0.1 mg per count)
//   "samples": [10012, 9990, ...]    // acceleration magnitude
// }
//
// The raw samples are always stored: the behaviour estimates on the tracking page are
// computed from them, and they let real cow data be studied later.
//
// HEART RATE: the old backend estimated a pulse from each burst in hr_process.php.
// That file was not part of the handover, so bursts are stored with analysed: false
// and no bpm. Port hr_process_payload() here when it arrives; the stored samples let
// earlier bursts be re-analysed then.

const MIN_SAMPLES = 20
const MAX_SAMPLES = 5000

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

    const fs = data.sample_rate_hz === undefined ? 20 : toNumber(data.sample_rate_hz)
    if (fs === null || fs <= 0 || fs > 1000) {
      return NextResponse.json({ error: "sample_rate_hz must be a number between 1 and 1000" }, { status: 400 })
    }
    const scale = data.scale_per_g === undefined ? DEFAULT_SCALE_PER_G : toNumber(data.scale_per_g)
    if (scale === null || scale <= 0) {
      return NextResponse.json({ error: "scale_per_g must be a positive number" }, { status: 400 })
    }
    const raw = data.samples
    if (!Array.isArray(raw) || raw.length < MIN_SAMPLES || raw.length > MAX_SAMPLES) {
      return NextResponse.json({ error: `samples must be an array of ${MIN_SAMPLES}-${MAX_SAMPLES} numbers` }, { status: 400 })
    }
    const samples = raw.map(toNumber)
    if (samples.some((s) => s === null)) {
      return NextResponse.json({ error: "samples must all be numbers" }, { status: 400 })
    }
    const values = samples as number[]

    await ensureTrackingIndexes()
    const doc: BurstDoc = {
      deviceRef: device._id,
      farmerId: device.farmerId,
      receivedAt: new Date(),
      sampleRateHz: fs,
      scalePerG: scale,
      durationSeconds: Math.round((values.length / fs) * 100) / 100,
      samples: values,
      sampleCount: values.length,
      motionMg: motionMg(values, scale),
      bpm: null,
      bpmPeaks: null,
      confidence: null,
      method: null,
      notes: null,
      analysed: false,
    }

    const db = await getTrackingDb()
    await db.collection<BurstDoc>(BURSTS).insertOne(doc)
    await db.collection(DEVICES).updateOne({ _id: device._id }, { $set: { lastSeenAt: doc.receivedAt } })

    // Same response shape as receive_burst.php, so the bridge needs no change.
    return NextResponse.json(
      {
        status: "ok",
        bpm: doc.bpm,
        confidence: doc.confidence,
        method: doc.method,
        motion_mg: doc.motionMg,
        notes: doc.notes,
        samples: doc.sampleCount,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("IoT burst error:", error)
    return NextResponse.json({ error: "Failed to save burst" }, { status: 500 })
  }
}
